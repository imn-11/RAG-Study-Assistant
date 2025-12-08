from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.llms import Ollama
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain.schema import Document
from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, TranscriptsDisabled, VideoUnavailable

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}})

# Config
VECTORSTORE_PATH = "data/vectorstore"
MODEL_NAME = "llama2:7b"  
PDF_FOLDER = "data/pdfs"

os.makedirs(PDF_FOLDER, exist_ok=True)
os.makedirs(os.path.dirname(VECTORSTORE_PATH), exist_ok=True)

llm = Ollama(model=MODEL_NAME, temperature=0.3)

embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2",
    model_kwargs={"device": "cpu"}
)

# Global vectorstore
vectorstore = None
current_source = None  # Track whether we have PDF or YouTube

if os.path.exists(VECTORSTORE_PATH):
    try:
        vectorstore = FAISS.load_local(VECTORSTORE_PATH, embeddings, allow_dangerous_deserialization=True)
        print("Vectorstore loaded successfully")
    except Exception as e:
        print(f"Could not load vectorstore: {e}")

# Prompt
custom_prompt_template = """
You are a helpful AI assistant helping a student understand the material.
Use the following context (from a YouTube video or PDF) to answer the question.
If the context does not contain enough information, say so clearly and do NOT invent or guess.

When answering:
- Avoid repeating words, sentences, or phrases from the context unless necessary.
- Avoid restating the question.
- Do not repeat information already provided.
- Do not hallucinate or introduce details not supported by the context.
- Keep the answer concise, focused, and accurate.

Context:
{context}

Question: {question}

Helpful Answer:
"""

CUSTOM_PROMPT = PromptTemplate(template=custom_prompt_template, input_variables=["context", "question"])

# Helper: Extract video ID from YouTube URL
def extract_video_id(url: str) -> str | None:
    import re
    patterns = [
        r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',
        r'(?:embed\/)([0-9A-Za-z_-]{11})',
        r'(?:youtu\.be\/)([0-9A-Za-z_-]{11})'
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

# ———————— NEW ENDPOINT: Add YouTube Transcript ————————
@app.route("/add-youtube", methods=["POST"])
def add_youtube():
    global vectorstore, current_source
    try:
        data = request.get_json()
        url = data.get("url", "").strip()

        if not url:
            return jsonify({"error": "No YouTube URL provided"}), 400

        video_id = extract_video_id(url)
        if not video_id:
            return jsonify({"error": "Invalid YouTube URL"}), 400

        print(f"Fetching transcript for video ID: {video_id}")

        # Get transcript (auto-generated or manual, English preferred)
        try:
            transcript_list = YouTubeTranscriptApi().list(video_id)

            # Try to get English manual > English auto > any manual > any auto
            transcript = None
            try:
                transcript = transcript_list.find_manually_created_transcript(['en'])
            except NoTranscriptFound:
                try:
                    transcript = transcript_list.find_generated_transcript(['en'])
                except NoTranscriptFound:
                    transcript = transcript_list.find_transcript(['en'])[0]  # fallback

            raw_transcript = transcript.fetch()
        except (TranscriptsDisabled, NoTranscriptFound):
            return jsonify({"error": "This video has no subtitles or they are disabled."}), 400
        except VideoUnavailable:
            return jsonify({"error": "Video is unavailable or private."}), 400

        # Combine text
        full_text = " ".join([entry.text for entry in raw_transcript])
        # Create a single document with metadata
        docs = [Document(page_content=full_text, metadata={"source": f"youtube:{video_id}", "title": "YouTube Video Transcript"})]

        # Split (optional – good for long videos)
        splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
        chunks = splitter.split_documents(docs)

        # Create new vectorstore
        vectorstore = FAISS.from_documents(chunks, embeddings)
        vectorstore.save_local(VECTORSTORE_PATH)
        current_source = "youtube"

        return jsonify({
            "message": "YouTube transcript loaded successfully!",
            "video_id": video_id,
            "duration_seconds": raw_transcript[-1].start + raw_transcript[-1].duration if raw_transcript else 0
        }), 200

    except Exception as e:
        print(f"Error adding YouTube: {e}")
        return jsonify({"error": str(e)}), 500

# UPLOAD PDF ENDPOINT
@app.route("/upload", methods=["POST"])
def upload_pdf():
    global vectorstore
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files["file"]

        # Only allow PDFs
        if not file.filename.endswith(".pdf"):
            return jsonify({"error": "Only PDF files are allowed"}), 400

        pdf_path = os.path.join(PDF_FOLDER, file.filename)
        file.save(pdf_path)
        print(f"✓ PDF saved: {pdf_path}")

        # Load PDF 
        loader = PyPDFLoader(pdf_path)
        documents = loader.load()
        print(f"✓ Loaded {len(documents)} pages")
        

        # Split text into manageable chunks
        splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)
        chunks = splitter.split_documents(documents)
        print(f"✓ Split into {len(chunks)} chunks")

        # Create FAISS vectorstore from embeddings
        vectorstore = FAISS.from_documents(chunks, embeddings)
        os.makedirs(os.path.dirname(VECTORSTORE_PATH), exist_ok=True)
        vectorstore.save_local(VECTORSTORE_PATH)
        print(f"✓ Vectorstore saved to {VECTORSTORE_PATH}")

        return jsonify({"message": f"PDF uploaded and processed: {file.filename}"}), 200
    
    except Exception as e:
        print(f"Error in upload: {str(e)}")
        return jsonify({"error": str(e)}), 500


# Chat endpoint
@app.route("/chat", methods=["POST"])
def chat():
    try:
        if vectorstore is None:
            return jsonify({"answer": "No document uploaded yet. Please upload a PDF first."}), 200

        data = request.get_json()
        question = data.get("query", "")
        if not question:
            return jsonify({"answer": "No question provided."}), 400

        print(f"Question: {question}")

        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=vectorstore.as_retriever(search_kwargs={"k": 3}),
            chain_type_kwargs={"prompt": CUSTOM_PROMPT},
            return_source_documents=True
        )

        result = qa_chain.invoke({"query": question})
        print(f"✓ Answer generated")
        return jsonify({"answer": result["result"]}), 200
    
    except Exception as e:
        print(f"❌ Error in chat: {str(e)}")
        return jsonify({"error": str(e)}), 500



# Health check (to check if vectorstore is loaded)
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "running",
        "vectorstore_loaded": vectorstore is not None,
        "source": current_source
    }), 200

if __name__ == "__main__":
    print("Starting Flask server on http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=True)

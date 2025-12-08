# RAG Study Assistant

A RAG (Retrieval-Augmented Generation) study assistant that lets you upload PDFs, ask questions, and get accurate answers using local LLMs (Ollama) or cloud models.

**Backend:** Flask + LangChain + Ollama/Whisper
**Frontend:** React + Vite + TailwindCSS (assumed from your structure)

---

## Features

- Upload PDFs and auto-extract text
- Smart chunking & embedding using sentence-transformers
- Vector store with FAISS
- Chat with your documents using Ollama (Mistral, Llama3, etc.)
- Audio transcription support via Whisper
- Clean React frontend with real-time chat

---

## Prerequisites

- **Python 3.11 or 3.12**
- **Node.js 18+** (for frontend)
- **ffmpeg** (required for audio transcription)

  - **Windows:** `choco install ffmpeg` or download from [ffmpeg.org](https://ffmpeg.org)
  - **macOS:** `brew install ffmpeg`
  - **Linux:** `sudo apt install ffmpeg`

---

## Quick Start (Full Setup)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/RAG-StudyAssistant.git
cd RAG-StudyAssistant
```

### 2. Set up the Backend (Flask)

```bash
# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r backend/pip-requirements.txt
```

### 3. Start the Backend

```bash
python backend/server.py
```

Backend API will run at: `http://127.0.0.1:5000`

### 4. Set up the Frontend (React + Vite)

In a new terminal, go back to the project root:

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run at: `http://localhost:5173` (or similar). Open your browser → `http://localhost:5173`.

---

## Project Structure

```
RAG-StudyAssistant/
├── backend/                 Flask API + RAG logic
│   ├── server.py            Main entry point
│   └── pip-requirements.txt All working Python packages
│
├── data/                    Uploaded files & vector store
│
├── frontend/                React + Vite app
│   ├── src/
│   └── package.json
├── venv/                    Python virtual environment (gitignored)
└── README.md
```

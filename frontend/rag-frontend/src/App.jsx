import { useState, useEffect, useRef } from "react";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [currentYouTube, setCurrentYouTube] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: input }),
      });

      const data = await response.json();
      const botMessage = {
        sender: "bot",
        text: data.answer || "No response received.",
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "❌ Error connecting to backend." },
      ]);
    }

    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") {
      alert("Please upload a PDF file");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      setUploadedFile({ name: file.name, size: file.size });
      setCurrentYouTube(null);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: `✓ PDF uploaded: ${file.name}` },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "❌ Error uploading PDF." },
      ]);
    }

    setUploading(false);
  };

  const handleAddYoutube = async () => {
    if (!youtubeUrl.trim()) return;
    setLoading(true);
    setShowYoutubeInput(false);
    try {
      const res = await fetch("http://localhost:5000/add-youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentYouTube({ videoId: data.video_id });
        setUploadedFile(null);
        setYoutubeUrl("");
        setMessages(prev => [...prev, { sender: "bot", text: `✓ YouTube transcript loaded!` }]);
      } else {
        setMessages(prev => [...prev, { sender: "bot", text: `❌ Error: ${data.error}` }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { sender: "bot", text: "❌ Failed to load transcript." }]);
    }
    setLoading(false);
  };

  const removeFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeYoutube = () => {
    setCurrentYouTube(null);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.statusDot} />
            <h1 style={styles.title}>Your AI Study Buddy</h1>
          </div>
          
          {uploadedFile && (
            <div style={styles.fileTag}>
              <svg style={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span style={styles.fileName}>{uploadedFile.name}</span>
              <button onClick={removeFile} style={styles.removeBtn}>
                <svg style={styles.iconSmall} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {currentYouTube && (
            <div style={styles.fileTag}>
              <svg style={styles.icon} viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 4-8 4z"/>
              </svg>
              <span style={styles.fileName}>YouTube Video</span>
              <button onClick={removeYoutube} style={styles.removeBtn}>
                <svg style={styles.iconSmall} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Messages Container */}
        <div style={styles.messagesContainer}>
          {messages.length === 0 && !uploadedFile && !currentYouTube && (
            <div style={styles.emptyState}>
              <div style={styles.emptyStateInner}>
                <svg style={styles.emptyIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <p style={styles.emptyText}>Upload a PDF or add a YouTube link to start</p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              style={msg.sender === "user" ? styles.userMsgContainer : styles.botMsgContainer}
            >
              <div style={msg.sender === "user" ? styles.userMsg : styles.botMsg}>
                {msg.text}
              </div>
            </div>
          ))}

          {loading && (
            <div style={styles.botMsgContainer}>
              <div style={styles.loadingMsg}>
                <svg style={styles.spinner} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={styles.inputArea}>
          {/* YouTube Input Modal (appears above input row) */}
          {showYoutubeInput && (
            <div style={styles.youtubeInputContainer}>
              <input
                type="text"
                placeholder="Paste YouTube link..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    handleAddYoutube();
                  } else if (e.key === 'Escape') {
                    setShowYoutubeInput(false);
                    setYoutubeUrl("");
                  }
                }}
                style={styles.input}
                autoFocus
              />
              <button
                onClick={handleAddYoutube}
                disabled={!youtubeUrl.trim() || loading}
                style={{...styles.youtubeSubmitBtn, opacity: (!youtubeUrl.trim() || loading) ? 0.4 : 1}}
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowYoutubeInput(false);
                  setYoutubeUrl("");
                }}
                style={styles.youtubeCancelBtn}
              >
                Cancel
              </button>
            </div>
          )}

          <div style={styles.inputRow}>
            {/* Plus Button with Dropdown */}
            <div style={styles.dropdownContainer}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                disabled={uploading || loading}
                style={{...styles.plusBtn, opacity: (uploading || loading) ? 0.4 : 1}}
                title="Add source"
              >
                <svg style={styles.iconBtn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div style={styles.dropdown}>
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowDropdown(false);
                    }}
                    style={styles.dropdownItem}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#262626'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <svg style={styles.dropdownIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload PDF
                  </button>
                  <button
                    onClick={() => {
                      setShowYoutubeInput(true);
                      setShowDropdown(false);
                    }}
                    style={styles.dropdownItem}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#262626'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <svg style={styles.dropdownIcon} viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 4-8 4z"/>
                    </svg>
                    Add YouTube Link
                  </button>
                </div>
              )}
            </div>

            {/* File Upload Button (Hidden) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              style={styles.hiddenInput}
            />

            {/* Message Input */}
            <input
              type="text"
              placeholder={uploadedFile || currentYouTube ? "Ask something..." : "Upload a source first..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={!uploadedFile && !currentYouTube}
              style={{...styles.input, opacity: (uploadedFile || currentYouTube) ? 1 : 0.5}}
            />

            {/* Send Button */}
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading || (!uploadedFile && !currentYouTube)}
              style={{...styles.sendBtn, opacity: (!input.trim() || loading || (!uploadedFile && !currentYouTube)) ? 0.4 : 1}}
            >
              <svg style={styles.iconBtn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    minWidth: "100vw",
    background: "#000000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    margin: 0,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
  },
  card: {
    width: "100%",
    maxWidth: "1024px",
    height: "88vh",
    display: "flex",
    flexDirection: "column",
    background: "#0a0a0a",
    borderRadius: "20px",
    border: "1px solid rgba(38, 38, 38, 0.6)",
    overflow: "hidden",
  },
  header: {
    padding: "20px 24px",
    borderBottom: "1px solid rgba(38, 38, 38, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#10b981",
    animation: "pulse 2s infinite",
  },
  title: {
    fontSize: "18px",
    fontWeight: "500",
    color: "#e5e5e5",
    margin: 0,
    letterSpacing: "-0.025em",
  },
  fileTag: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 12px",
    background: "#171717",
    border: "1px solid rgba(38, 38, 38, 0.6)",
    borderRadius: "8px",
  },
  fileName: {
    fontSize: "12px",
    color: "#a3a3a3",
    maxWidth: "200px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  removeBtn: {
    background: "none",
    border: "none",
    color: "#737373",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
  },
  icon: {
    width: "14px",
    height: "14px",
    color: "#a3a3a3",
  },
  iconSmall: {
    width: "14px",
    height: "14px",
  },
  messagesContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  emptyState: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  emptyStateInner: {
    textAlign: "center",
  },
  emptyIcon: {
    width: "40px",
    height: "40px",
    color: "#404040",
    margin: "0 auto 12px",
  },
  emptyText: {
    fontSize: "14px",
    color: "#737373",
    margin: 0,
  },
  userMsgContainer: {
    display: "flex",
    justifyContent: "flex-end",
  },
  botMsgContainer: {
    display: "flex",
    justifyContent: "flex-start",
  },
  userMsg: {
    maxWidth: "80%",
    padding: "12px 16px",
    borderRadius: "8px",
    fontSize: "14px",
    lineHeight: "1.6",
    background: "#f5f5f5",
    color: "#171717",
  },
  botMsg: {
    maxWidth: "80%",
    padding: "12px 16px",
    borderRadius: "8px",
    fontSize: "14px",
    lineHeight: "1.6",
    background: "#171717",
    color: "#e5e5e5",
    border: "1px solid rgba(38, 38, 38, 0.6)",
  },
  loadingMsg: {
    background: "#171717",
    border: "1px solid rgba(38, 38, 38, 0.6)",
    padding: "12px 16px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#a3a3a3",
    fontSize: "14px",
  },
  spinner: {
    width: "14px",
    height: "14px",
    animation: "spin 1s linear infinite",
  },
  inputArea: {
    padding: "16px 24px",
    borderTop: "1px solid rgba(38, 38, 38, 0.6)",
    position: "relative",
  },
  youtubeInputContainer: {
    display: "flex",
    gap: "8px",
    marginBottom: "12px",
    alignItems: "center",
  },

  youtubeSubmitBtn: {
    background: "#f5f5f5",
    color: "#171717",
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
  youtubeCancelBtn: {
    background: "#262626",
    color: "#a3a3a3",
    padding: "10px 20px",
    borderRadius: "8px",
    border: "1px solid rgba(38, 38, 38, 0.6)",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
  inputRow: {
    display: "flex",
    gap: "10px",
  },
  hiddenInput: {
    display: "none",
  },
  dropdownContainer: {
    position: "relative",
  },
  plusBtn: {
    background: "#171717",
    color: "#d4d4d4",
    padding: "10px 12px",
    borderRadius: "25px",
    border: "1px solid rgba(38, 38, 38, 0.6)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    transition: "background 0.2s",
  },
  dropdown: {
    position: "absolute",
    bottom: "110%",
    left: 0,
    background: "#171717",
    border: "1px solid rgba(38, 38, 38, 0.6)",
    borderRadius: "8px",
    overflow: "hidden",
    minWidth: "200px",
    zIndex: 1000,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
  },
  dropdownItem: {
    width: "100%",
    background: "none",
    border: "none",
    color: "#e5e5e5",
    padding: "12px 16px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "14px",
    textAlign: "left",
    transition: "background 0.2s",
  },
  dropdownIcon: {
    width: "18px",
    height: "18px",
    color: "#a3a3a3",
  },
  input: {
    flex: 1,
    background: "#171717",
    color: "#e5e5e5",
    padding: "10px 16px",
    borderRadius: "25px",
    border: "1px solid rgba(38, 38, 38, 0.6)",
    outline: "none",
    fontSize: "14px",
  },
  sendBtn: {
    background: "#f5f5f5",
    color: "#171717",
    padding: "10px 20px",
    borderRadius: "25px",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    fontWeight: "500",
    transition: "background 0.2s",
  },
  iconBtn: {
    width: "16px",
    height: "16px",
  },
};
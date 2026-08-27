"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Bot, Send, Download, FileText, GripVertical } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatWindowProps {
  pdfUrl?: string;
  fileName?: string;
}

export default function ChatWindow({ pdfUrl = "", fileName = "document.pdf" }: ChatWindowProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Resizable split screen states
  const [leftWidth, setLeftWidth] = useState(50); // percentage width of left panel
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto scroll chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Load history
  useEffect(() => {
    fetch("http://127.0.0.1:8000/tutor/history/")
      .then((res) => res.json())
      .then((data) => {
        const formatted = data.flatMap((item: any) => [
          { role: "user", text: item.question },
          { role: "ai", text: item.answer },
        ]);
        setMessages(formatted);
      })
      .catch(() => {});
  }, []);

  // Handle mouse drag for resizing panels
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = (x / rect.width) * 100;
      
      // Restrict panels from shrinking below 20% or expanding past 80%
      if (percentage >= 20 && percentage <= 80) {
        setLeftWidth(percentage);
      }
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const send = async () => {
    if (!text.trim()) return;

    const userMessage = { role: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    setText("");
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/tutor/ask/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "ai", text: data.answer }]);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const element = document.createElement("a");
    element.href = pdfUrl;
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col gap-4 p-2 select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">AI Tutor & PDF Workspace · StudyFlow</p>
          <h1 className="text-2xl font-semibold tracking-tight">Study together</h1>
        </div>
      </div>

      {/* Main Resizable Split Container */}
      <div 
        ref={containerRef}
        className="flex flex-1 overflow-hidden relative gap-2"
      >
        
        {/* LEFT COLUMN: PDF Viewer */}
        <div 
          style={{ width: `${leftWidth}%` }}
          className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm h-full"
        >
          {/* Top PDF Toolbar */}
          <div className="flex items-center justify-between border-b border-border p-4 bg-muted/40">
            <div className="flex items-center gap-2 truncate">
              <FileText className="size-4 text-primary shrink-0" />
              <span className="text-sm font-medium truncate">{fileName}</span>
            </div>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition"
              title="Download PDF"
            >
              <Download className="size-3.5" />
              Download PDF
            </button>
          </div>

          {/* Native Browser PDF Embed */}
          <div className="flex-1 w-full h-full bg-muted/20 relative">
            {pdfUrl ? (
              <iframe
                src={`${pdfUrl}#toolbar=1&view=FitH`}
                className="w-full h-full border-0"
                title={fileName}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
                <FileText className="size-10 mb-2 opacity-40" />
                <p className="text-sm font-medium">No PDF loaded</p>
                <p className="text-xs mt-1">Please upload a PDF file from the home dashboard first.</p>
              </div>
            )}
          </div>
        </div>

        {/* RESIZABLE DIVIDER BAR */}
        <div
          onMouseDown={handleMouseDown}
          className="w-2 flex items-center justify-center cursor-col-resize group z-10 hover:bg-primary/20 transition rounded-lg"
          title="Drag to resize panels"
        >
          <GripVertical className="size-4 text-muted-foreground group-hover:text-primary transition" />
        </div>

        {/* RIGHT COLUMN: AI Chat Window */}
        <div 
          style={{ width: `${100 - leftWidth}%` }}
          className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm h-full"
        >
          {/* Top bar */}
          <div className="flex items-center gap-3 border-b border-border p-4 bg-card">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bot className="size-5" />
            </span>

            <div>
              <p className="text-sm font-semibold">StudyFlow tutor</p>
              <p className="text-xs text-muted-foreground">
                Grounded in your uploaded PDF
              </p>
            </div>

            <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-green-500" />
              Online
            </span>
          </div>

          {/* Messages */}
          <div className="flex flex-1 flex-col gap-5 p-5 overflow-y-auto">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex max-w-[85%] gap-3 ${
                  m.role === "user" ? "ml-auto flex-row-reverse" : ""
                }`}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {m.role === "ai" ? "AI" : "U"}
                </span>

                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {m.text}
                  </ReactMarkdown>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs">
                  AI
                </span>
                <div className="bg-muted px-4 py-3 rounded-2xl animate-pulse text-sm text-muted-foreground">
                  Thinking...
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Suggestions & Input Container */}
          <div className="border-t border-border bg-card p-4 flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {[
                "Explain this simply",
                "Give me an example",
                "Quiz me on this",
              ].map((p) => (
                <button
                  key={p}
                  onClick={() => setText(p)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition"
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Ask anything about your PDF…"
                className="flex-1 bg-transparent px-2 text-sm outline-none text-foreground"
              />

              <button
                onClick={send}
                className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition hover:opacity-90"
              >
                <Send className="size-4" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
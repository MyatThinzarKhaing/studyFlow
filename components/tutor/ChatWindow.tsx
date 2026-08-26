"use client";
import { useState, useEffect, useRef } from "react";
import { Bot, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatWindow() {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll
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

  const send = async () => {
    if (!text.trim()) return;

    const userMessage = { role: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    setText("");
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/tutor/ask/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: text }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: "ai", text: data.answer },
      ]);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-[#FCFAF5] p-6">

      {/* Header */}
      <div>
        <p className="text-xs text-gray-500">AI tutor · StudyFlow</p>
        <h1 className="text-2xl font-semibold">Study together</h1>
      </div>

      {/* Chat Card */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-3xl bg-white shadow-sm">

        {/* Top bar */}
        <div className="flex items-center gap-3 border-b border-[#E8E2D6] p-5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#F3F0E8]">
            <Bot className="size-5" />
          </span>

          <div>
            <p className="text-sm font-semibold">StudyFlow tutor</p>
            <p className="text-xs text-gray-500">
              Grounded in your uploaded PDF
            </p>
          </div>

          <span className="ml-auto text-xs text-gray-500 flex items-center gap-1.5">
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
              {/* Avatar */}
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#F3F0E8] text-xs font-semibold">
                {m.role === "ai" ? "AI" : "U"}
              </span>

              {/* Bubble */}
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                  m.role === "user"
                    ? "bg-[#F6E7B8]"
                    : "bg-[#F3F0E8]"
                }`}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {m.text}
                </ReactMarkdown>
              </div>
            </div>
          ))}

          {/* Typing */}
          {loading && (
            <div className="flex gap-3">
              <span className="flex size-7 items-center justify-center rounded-full bg-[#F3F0E8] text-xs">
                AI
              </span>
              <div className="bg-[#F3F0E8] px-4 py-3 rounded-2xl animate-pulse">
                Thinking...
              </div>
            </div>
          )}

          <div ref={bottomRef} />

          {/* Suggestions */}
          <div className="mt-auto flex flex-wrap gap-2">
            {[
              "Explain this simply",
              "Give me an example",
              "Quiz me on this",
            ].map((p) => (
              <button
                key={p}
                onClick={() => setText(p)}
                className="rounded-full border border-[#E8E2D6] px-3 py-1.5 text-xs text-gray-500 hover:bg-[#F3F0E8]"
              >
                {p}
              </button>
            ))}
          </div>

        </div>

        {/* Input */}
        <div className="border-t border-[#E8E2D6] p-4">
          <div className="flex items-center gap-2 rounded-xl border border-[#E8E2D6] bg-[#FCFAF5] p-2">

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
              className="flex-1 bg-transparent px-2 text-sm outline-none"
            />

            <button
              onClick={send}
              className="flex size-9 items-center justify-center rounded-lg bg-[#F6E7B8]"
            >
              <Send className="size-4" />
            </button>

          </div>
        </div>

      </div>
    </div>
  );
}
import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import api from "@/lib/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const WELCOME: ChatMessage = {
  role: "assistant",
  content: "Hi! I'm the BusinessOS Assistant. Ask me how to use any feature — CRM, Inventory, GST invoicing, Buyer Leads, HR, and more.",
};

export default function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const nextMessages = [...messages, { role: "user", content: text } as ChatMessage];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setLoading(true);
    try {
      const res = await api.post("/chatbot/chat", { messages: nextMessages });
      const reply: string = res.data?.data?.reply ?? "Sorry, I couldn't generate a response.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((p) => !p)}
        aria-label={open ? "Close support chat" : "Open support chat"}
        style={{
          position: "fixed", right: 24, bottom: 24, zIndex: 200,
          width: 52, height: 52, borderRadius: "50%", border: "none", cursor: "pointer",
          background: "#74CDE8", color: "#0b1620",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 12px 32px rgba(116,205,232,0.4)",
        }}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div
          style={{
            position: "fixed", right: 24, bottom: 88, zIndex: 200, width: 360, maxWidth: "calc(100vw - 32px)",
            height: 480, maxHeight: "calc(100vh - 140px)",
            background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16,
            boxShadow: "0 24px 80px var(--shadow)", overflow: "hidden",
            display: "flex", flexDirection: "column",
          }}
        >
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(116,205,232,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MessageCircle size={16} color="#74CDE8" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>BusinessOS Assistant</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Ask anything about the app</div>
            </div>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  background: m.role === "user" ? "#74CDE8" : "var(--bg-main)",
                  color: m.role === "user" ? "#0b1620" : "var(--text-primary)",
                  border: m.role === "user" ? "none" : "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "8px 12px",
                  fontSize: 13,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", fontSize: 12 }}>
                <Loader2 size={14} className="animate-spin" />
                Thinking...
              </div>
            )}
            {error && (
              <div style={{ alignSelf: "flex-start", maxWidth: "85%", fontSize: 12, color: "#F87171", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "8px 10px" }}>
                {error}
              </div>
            )}
          </div>

          <div style={{ padding: 10, borderTop: "1px solid var(--border)", display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your question..."
              rows={1}
              style={{
                flex: 1, resize: "none", maxHeight: 80, padding: "8px 10px", fontSize: 13,
                borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-main)",
                color: "var(--text-primary)", outline: "none",
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: 10, border: "none",
                background: loading || !input.trim() ? "var(--border)" : "#74CDE8",
                color: "#0b1620", display: "flex", alignItems: "center", justifyContent: "center",
                cursor: loading || !input.trim() ? "default" : "pointer",
              }}
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import {
  Mail, Send, Plus, Search, X, Trash2, RefreshCw,
  Inbox, Star, FileText, AlertTriangle, LogOut, Loader2,
  Reply, ChevronLeft, MailOpen,
} from "lucide-react";
import { useLocation } from "react-router-dom";

const API = import.meta.env.VITE_API_URL ?? "";

// ── Styles ───────────────────────────────────────────────────
const S = {
  input: { background: "var(--bg-hover)", border: "1px solid var(--border-input)", borderRadius: 8, padding: "8px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" } as React.CSSProperties,
  btn: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "#fff", padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 } as React.CSSProperties,
  ghost: { background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-secondary)", padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 5 } as React.CSSProperties,
};

interface GmailStatus { connected: boolean; email: string | null; }
interface GmailLabel { id: string; name: string; messagesUnread?: number; }
interface GmailMessage {
  id: string; threadId: string; subject: string; from: string; to: string;
  date: string; snippet: string; unread: boolean; labelIds?: string[];
}
interface GmailMessageFull extends GmailMessage { html: string; text: string; cc?: string; }

// ── Compose Modal ────────────────────────────────────────────
function ComposeModal({ onClose, onSent, replyTo }: {
  onClose: () => void; onSent: () => void; replyTo?: { to: string; subject: string; threadId: string } | null;
}) {
  const [form, setForm] = useState({
    to: replyTo?.to ?? "",
    subject: replyTo ? `Re: ${replyTo.subject.replace(/^Re: /i, "")}` : "",
    body: "",
  });
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  async function send() {
    if (!form.to || !form.subject || !form.body) { setErr("To, Subject and Body are required"); return; }
    setSending(true);
    try {
      await api.post("/gmail/send", {
        to: form.to, subject: form.subject, body: form.body,
        ...(replyTo?.threadId && { threadId: replyTo.threadId }),
      });
      onSent(); onClose();
    } catch (e: any) {
      setErr(e.response?.data?.message ?? "Failed to send");
    } finally { setSending(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-6" style={{ pointerEvents: "none" }}>
      <div className="rounded-2xl overflow-hidden shadow-2xl w-full max-w-lg" style={{ pointerEvents: "all", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
          <span className="text-sm font-bold text-white">{replyTo ? "Reply" : "New Message"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}><X style={{ width: 16, height: 16 }} /></button>
        </div>
        {/* Fields */}
        <div className="p-4 space-y-3">
          {err && <p className="text-xs text-red-400">{err}</p>}
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--text-ghost)" }}>To</label>
            <input style={S.input} value={form.to} onChange={e => setForm(p => ({ ...p, to: e.target.value }))} placeholder="recipient@example.com" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--text-ghost)" }}>Subject</label>
            <input style={S.input} value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Subject" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--text-ghost)" }}>Message</label>
            <textarea style={{ ...S.input, resize: "vertical", minHeight: 140 } as React.CSSProperties} value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder="Write your message..." />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={onClose} style={S.ghost}>Cancel</button>
            <button onClick={send} disabled={sending} style={S.btn}>
              {sending ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 13, height: 13 }} />}
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Connect Gmail Banner ─────────────────────────────────────
function ConnectGmailPage({ onConnect }: { onConnect: () => void }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function connect() {
    setLoading(true); setErr("");
    try {
      const r = await api.get("/gmail/auth-url");
      window.location.href = r.data.data.url;
    } catch (e: any) {
      setErr(e.response?.data?.message ?? "Failed to start Gmail OAuth");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
      <div className="rounded-full w-20 h-20 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
        <Mail style={{ width: 36, height: 36, color: "#fff" }} />
      </div>
      <div className="text-center max-w-sm">
        <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Connect Your Gmail</h2>
        <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
          Read your inbox, reply to emails, and send messages — all without leaving this tool.
        </p>
        <p className="text-xs" style={{ color: "var(--text-ghost)" }}>
          You'll be redirected to Google to sign in and grant access. Your emails stay private.
        </p>
      </div>
      {err && (
        <div className="text-xs text-red-400 px-4 py-2 rounded-lg" style={{ background: "#1a0a0a", border: "1px solid #7f1d1d" }}>
          {err.includes("GOOGLE_CLIENT_ID") ? (
            <span>Gmail OAuth not configured yet. See setup instructions below.</span>
          ) : err}
        </div>
      )}
      <button onClick={connect} disabled={loading} style={{ ...S.btn, padding: "12px 28px", fontSize: 14 }}>
        {loading ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <Mail style={{ width: 16, height: 16 }} />}
        {loading ? "Redirecting to Google…" : "Connect Gmail Account"}
      </button>

      {/* Setup instructions */}
      <div className="w-full max-w-lg rounded-xl p-5 text-xs space-y-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Setup Required (one-time) — Google Cloud Console</p>
        <ol className="space-y-2 list-decimal list-inside" style={{ color: "var(--text-secondary)" }}>
          <li>Go to <span className="font-mono" style={{ color: "#818cf8" }}>console.cloud.google.com</span> → Create a new project</li>
          <li>Enable <strong>Gmail API</strong> (APIs &amp; Services → Library → search Gmail)</li>
          <li>Go to <strong>OAuth consent screen</strong> → External → fill in App name &amp; your email</li>
          <li>Add scopes: <span className="font-mono" style={{ color: "#818cf8" }}>gmail.readonly, gmail.send, gmail.modify</span></li>
          <li>Go to <strong>Credentials</strong> → Create OAuth 2.0 Client ID → Web Application</li>
          <li>Add Authorized redirect URI: <span className="font-mono" style={{ color: "#4ade80" }}>http://localhost:5000/api/gmail/callback</span></li>
          <li>Copy <strong>Client ID</strong> and <strong>Client Secret</strong></li>
          <li>Add to your <span className="font-mono">.env</span> file:</li>
        </ol>
        <div className="rounded-lg p-3 font-mono text-xs" style={{ background: "#0f172a", color: "#4ade80" }}>
          GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com<br />
          GOOGLE_CLIENT_SECRET=your-client-secret<br />
          GOOGLE_REDIRECT_URI=http://localhost:5000/api/gmail/callback
        </div>
        <p style={{ color: "var(--text-ghost)" }}>After adding these, restart the backend server, then click "Connect Gmail Account" above.</p>
      </div>
    </div>
  );
}

// ── Message Viewer ───────────────────────────────────────────
function MessageViewer({ msg, onBack, onReply, onTrash }: {
  msg: GmailMessageFull; onBack: () => void;
  onReply: (data: { to: string; subject: string; threadId: string }) => void;
  onTrash: (id: string) => void;
}) {
  function extractEmail(from: string) {
    const m = from.match(/<(.+?)>/);
    return m ? m[1] : from;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <button onClick={onBack} style={{ ...S.ghost, padding: "6px 10px" }}>
          <ChevronLeft style={{ width: 14, height: 14 }} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{msg.subject}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onReply({ to: extractEmail(msg.from), subject: msg.subject, threadId: msg.threadId })}
            style={{ ...S.ghost, gap: 5 }}>
            <Reply style={{ width: 13, height: 13 }} /> Reply
          </button>
          <button onClick={() => onTrash(msg.id)} style={{ ...S.ghost, color: "#f87171" }}>
            <Trash2 style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="px-5 py-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-hover)" }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", flexShrink: 0 }}>
            {(msg.from.charAt(0) || "?").toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{msg.from}</p>
            <p className="text-[11px]" style={{ color: "var(--text-ghost)" }}>
              To: {msg.to} {msg.cc ? `· CC: ${msg.cc}` : ""} · {new Date(msg.date).toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5">
        {msg.html ? (
          <div className="prose prose-sm max-w-none" style={{ color: "var(--text-secondary)" }}
            dangerouslySetInnerHTML={{ __html: msg.html }} />
        ) : (
          <pre className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)", fontFamily: "inherit" }}>{msg.text}</pre>
        )}
      </div>
    </div>
  );
}

// ── Main EmailPage ───────────────────────────────────────────
export default function EmailPage() {
  const location = useLocation();
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [labels, setLabels] = useState<GmailLabel[]>([]);
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [activeLabel, setActiveLabel] = useState("INBOX");
  const [selected, setSelected] = useState<GmailMessageFull | null>(null);
  const [loading, setLoading] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showCompose, setShowCompose] = useState(false);
  const [replyData, setReplyData] = useState<{ to: string; subject: string; threadId: string } | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check status + handle OAuth redirect
  useEffect(() => {
    checkStatus();
    const params = new URLSearchParams(location.search);
    if (params.get("gmail") === "connected") {
      window.history.replaceState({}, "", "/email");
    }
  }, []);

  async function checkStatus() {
    try {
      const r = await api.get("/gmail/status");
      setStatus(r.data.data);
      if (r.data.data.connected) {
        loadLabels();
        loadMessages("INBOX");
      }
    } catch { setStatus({ connected: false, email: null }); }
  }

  async function loadLabels() {
    try {
      const r = await api.get("/gmail/labels");
      setLabels(r.data.data.labels ?? []);
    } catch {}
  }

  async function loadMessages(label: string, q?: string, pageToken?: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ label, maxResults: "25" });
      if (q) params.set("q", q);
      if (pageToken) params.set("pageToken", pageToken);
      const r = await api.get(`/gmail/inbox?${params}`);
      const d = r.data.data;
      if (pageToken) {
        setMessages(p => [...p, ...(d.messages ?? [])]);
      } else {
        setMessages(d.messages ?? []);
      }
      setNextPageToken(d.nextPageToken ?? null);
    } catch {}
    setLoading(false);
  }

  async function openMessage(id: string) {
    setMsgLoading(true);
    try {
      const r = await api.get(`/gmail/message/${id}`);
      setSelected(r.data.data);
      // Mark as read in local state
      setMessages(p => p.map(m => m.id === id ? { ...m, unread: false } : m));
    } catch {}
    setMsgLoading(false);
  }

  async function trashMessage(id: string) {
    try {
      await api.delete(`/gmail/message/${id}`);
      setMessages(p => p.filter(m => m.id !== id));
      setSelected(null);
    } catch {}
  }

  async function disconnect() {
    await api.delete("/gmail/disconnect");
    setStatus({ connected: false, email: null });
    setMessages([]); setLabels([]); setSelected(null);
  }

  function switchLabel(labelId: string) {
    setActiveLabel(labelId);
    setSelected(null);
    setSearch("");
    setSearchInput("");
    loadMessages(labelId);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setSelected(null);
    loadMessages(activeLabel, searchInput);
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  function extractName(from: string) {
    const m = from.match(/^(.+?)\s*</);
    return m ? m[1].replace(/"/g, "") : from.split("@")[0];
  }

  const SYSTEM_LABELS = [
    { id: "INBOX", name: "Inbox", Icon: Inbox },
    { id: "SENT", name: "Sent", Icon: Send },
    { id: "DRAFT", name: "Drafts", Icon: FileText },
    { id: "STARRED", name: "Starred", Icon: Star },
    { id: "SPAM", name: "Spam", Icon: AlertTriangle },
    { id: "TRASH", name: "Trash", Icon: Trash2 },
  ];

  const userLabels = labels.filter(l => !SYSTEM_LABELS.find(s => s.id === l.id));

  if (!status) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 style={{ width: 24, height: 24, color: "#6366f1", animation: "spin 1s linear infinite" }} />
    </div>
  );

  if (!status.connected) return <ConnectGmailPage onConnect={checkStatus} />;

  return (
    <div className="flex h-full overflow-hidden" style={{ minHeight: "calc(100vh - 60px)" }}>

      {/* ── Left Sidebar ── */}
      <div className="flex-shrink-0 flex flex-col py-3" style={{ width: 200, borderRight: "1px solid var(--border)", background: "var(--bg-card)" }}>
        {/* Connected account */}
        <div className="px-3 mb-3">
          <div className="rounded-xl px-3 py-2.5" style={{ background: "var(--bg-hover)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                {(status.email?.charAt(0) ?? "G").toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{status.email}</p>
                <p className="text-[9px]" style={{ color: "#4ade80" }}>● Connected</p>
              </div>
            </div>
          </div>
        </div>

        {/* Compose button */}
        <div className="px-3 mb-4">
          <button onClick={() => { setReplyData(null); setShowCompose(true); }} style={{ ...S.btn, width: "100%", justifyContent: "center", padding: "9px 0" }}>
            <Plus style={{ width: 14, height: 14 }} /> Compose
          </button>
        </div>

        {/* System Labels */}
        <div className="flex-1 overflow-y-auto">
          {SYSTEM_LABELS.map(({ id, name, Icon }) => {
            const labelInfo = labels.find(l => l.id === id);
            return (
              <button key={id} onClick={() => switchLabel(id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs"
                style={{
                  background: activeLabel === id ? "var(--bg-hover)" : "transparent",
                  borderLeft: activeLabel === id ? "2px solid #6366f1" : "2px solid transparent",
                  color: activeLabel === id ? "var(--text-primary)" : "var(--text-secondary)",
                  cursor: "pointer", border: "none", textAlign: "left", fontWeight: activeLabel === id ? 600 : 400,
                }}>
                <Icon style={{ width: 13, height: 13, flexShrink: 0 }} />
                <span className="flex-1">{name}</span>
                {labelInfo?.messagesUnread ? (
                  <span style={{ fontSize: 9, background: "#4f46e5", color: "#fff", borderRadius: 99, padding: "1px 5px", fontWeight: 700 }}>
                    {labelInfo.messagesUnread}
                  </span>
                ) : null}
              </button>
            );
          })}

          {/* User labels */}
          {userLabels.length > 0 && (
            <>
              <p className="px-3 mt-4 mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-ghost)" }}>Labels</p>
              {userLabels.map(l => (
                <button key={l.id} onClick={() => switchLabel(l.id!)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs"
                  style={{
                    background: activeLabel === l.id ? "var(--bg-hover)" : "transparent",
                    borderLeft: activeLabel === l.id ? "2px solid #6366f1" : "2px solid transparent",
                    color: activeLabel === l.id ? "var(--text-primary)" : "var(--text-secondary)",
                    cursor: "pointer", border: "none", textAlign: "left",
                  }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#818cf8" }} />
                  <span className="truncate">{l.name}</span>
                </button>
              ))}
            </>
          )}
        </div>

        {/* Disconnect */}
        <div className="px-3 mt-2">
          <button onClick={disconnect} style={{ ...S.ghost, width: "100%", justifyContent: "center", fontSize: 11 }}>
            <LogOut style={{ width: 11, height: 11 }} /> Disconnect
          </button>
        </div>
      </div>

      {/* ── Message List ── */}
      <div className="flex-shrink-0 flex flex-col overflow-hidden" style={{ width: selected ? 300 : "calc(100% - 200px)", borderRight: selected ? "1px solid var(--border)" : "none", transition: "width 0.15s" }}>
        {/* Search bar */}
        <div className="px-3 py-3 flex-shrink-0 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="flex-1 relative">
              <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "var(--text-ghost)" }} />
              <input style={{ ...S.input, paddingLeft: 32, height: 34, fontSize: 12 }} placeholder="Search mail…"
                value={searchInput} onChange={e => setSearchInput(e.target.value)} />
            </div>
            <button type="submit" style={{ ...S.ghost, padding: "0 12px", height: 34, fontSize: 12 }}>Go</button>
          </form>
          <button onClick={() => loadMessages(activeLabel, search)} title="Refresh" style={{ ...S.ghost, padding: "0 10px", height: 34 }}>
            <RefreshCw style={{ width: 13, height: 13 }} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Label header */}
        <div className="px-4 py-2 flex-shrink-0 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-hover)" }}>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
            {SYSTEM_LABELS.find(l => l.id === activeLabel)?.name ?? activeLabel}
          </span>
          {search && <span className="text-xs" style={{ color: "#818cf8" }}>"{search}" · <button onClick={() => { setSearch(""); setSearchInput(""); loadMessages(activeLabel); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#818cf8" }}>clear</button></span>}
        </div>

        {/* Message rows */}
        <div className="flex-1 overflow-y-auto">
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 style={{ width: 22, height: 22, color: "#6366f1", animation: "spin 1s linear infinite" }} />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <MailOpen style={{ width: 36, height: 36, color: "var(--text-ghost)" }} />
              <p className="text-sm" style={{ color: "var(--text-ghost)" }}>No messages</p>
            </div>
          ) : (
            <>
              {messages.map(m => (
                <div key={m.id} onClick={() => openMessage(m.id)}
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer"
                  style={{
                    background: selected?.id === m.id ? "var(--bg-hover)" : "transparent",
                    borderBottom: "1px solid var(--border)",
                    borderLeft: m.unread ? "3px solid #6366f1" : "3px solid transparent",
                  }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                    style={{ background: m.unread ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "var(--bg-hover)", border: "1px solid var(--border)" }}>
                    {extractName(m.from).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs truncate" style={{ color: "var(--text-primary)", fontWeight: m.unread ? 700 : 500 }}>
                        {extractName(m.from)}
                      </span>
                      <span className="text-[10px] flex-shrink-0 ml-2" style={{ color: "var(--text-ghost)" }}>{formatDate(m.date)}</span>
                    </div>
                    <p className="text-xs truncate mb-0.5" style={{ color: m.unread ? "var(--text-secondary)" : "var(--text-ghost)", fontWeight: m.unread ? 600 : 400 }}>
                      {m.subject}
                    </p>
                    <p className="text-[11px] truncate" style={{ color: "var(--text-ghost)" }}>{m.snippet}</p>
                  </div>
                </div>
              ))}
              {nextPageToken && (
                <div className="text-center py-4">
                  <button onClick={() => loadMessages(activeLabel, search, nextPageToken!)} style={S.ghost} disabled={loading}>
                    {loading ? "Loading…" : "Load More"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Message Viewer ── */}
      {selected && (
        <div className="flex-1 overflow-hidden" style={{ minWidth: 0 }}>
          {msgLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 style={{ width: 24, height: 24, color: "#6366f1", animation: "spin 1s linear infinite" }} />
            </div>
          ) : (
            <MessageViewer
              msg={selected}
              onBack={() => setSelected(null)}
              onReply={(data) => { setReplyData(data); setShowCompose(true); }}
              onTrash={trashMessage}
            />
          )}
        </div>
      )}

      {/* ── Compose / Reply Modal ── */}
      {showCompose && (
        <ComposeModal
          replyTo={replyData}
          onClose={() => { setShowCompose(false); setReplyData(null); }}
          onSent={() => { if (activeLabel === "SENT") loadMessages("SENT"); }}
        />
      )}
    </div>
  );
}

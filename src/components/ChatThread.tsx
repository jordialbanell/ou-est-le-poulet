import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Message } from "../lib/types";

function timeOf(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

/** Message list + composer. `viewerIsChicken` controls which side bubbles sit on. */
export function ChatThread({
  messages,
  viewerIsChicken,
  onSend,
  emptyHint = "No messages yet. Say hello! 👋",
}: {
  messages: Message[];
  viewerIsChicken: boolean;
  onSend: (content: string) => Promise<void>;
  emptyHint?: string;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newest.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    try {
      await onSend(content);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <p className="mt-8 text-center text-sm opacity-50">{emptyHint}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((m) => {
              const mine = m.is_chicken === viewerIsChicken;
              return (
                <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                      mine
                        ? "rounded-br-md bg-[var(--color-gold)] text-white"
                        : "rounded-bl-md bg-black/10 text-ink"
                    }`}
                  >
                    <p className="text-sm leading-snug">{m.content}</p>
                  </div>
                  <p className="mt-0.5 px-1 text-[11px] font-semibold opacity-50">
                    {m.sender} · {timeOf(m.sent_at)}
                  </p>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {error && (
        <p className="px-4 pb-1 text-xs font-semibold text-[var(--color-alert)]">{error}</p>
      )}

      <form onSubmit={submit} className="safe-bottom flex items-center gap-2 border-t-2 border-black/10 p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 500))}
          placeholder="Type a message…"
          className="min-w-0 flex-1 rounded-2xl border-2 border-black/15 bg-white/70 px-4 py-2.5 text-base outline-none focus:border-[var(--color-gold)]"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="font-display min-h-[44px] shrink-0 rounded-2xl bg-[var(--color-gold)] px-4 font-bold uppercase text-white transition active:scale-95 disabled:opacity-50"
        >
          {sending ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}

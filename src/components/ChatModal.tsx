import { useMemo } from "react";
import { sendMessage } from "../lib/actions";
import type { Message } from "../lib/types";
import { ChatThread } from "./ChatThread";

/** Full-screen chat between this team and the Chicken. */
export function ChatModal({
  gameId,
  teamId,
  teamName,
  messages,
  onClose,
}: {
  gameId: string;
  teamId: string;
  teamName: string;
  messages: Message[];
  onClose: () => void;
}) {
  const thread = useMemo(
    () =>
      messages
        .filter((m) => m.team_id === teamId)
        .sort((a, b) => a.sent_at.localeCompare(b.sent_at)),
    [messages, teamId],
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-paper)]">
      <header className="flex items-center justify-between border-b-2 border-black/10 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)]">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐔</span>
          <div>
            <p className="font-display font-extrabold leading-none">Chat with the Chicken</p>
            <p className="text-[11px] font-semibold opacity-50">{teamName}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close chat"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/10 text-lg font-bold"
        >
          ✕
        </button>
      </header>

      <ChatThread
        messages={thread}
        viewerIsChicken={false}
        onSend={(content) => sendMessage(gameId, teamId, teamName, content, false)}
        emptyHint="Message the Chicken — ask for a hint, plead your case… 🙏"
      />
    </div>
  );
}

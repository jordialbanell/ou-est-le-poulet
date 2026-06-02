import { useEffect } from "react";
import type { GameAlert } from "../hooks/useGame";

interface View {
  emoji: string;
  text: string;
  cls: string;
  duration: number;
}

function viewFor(alert: GameAlert): View {
  switch (alert.kind) {
    case "points":
      if (alert.points < 0) {
        return {
          emoji: "💀",
          text: `−${Math.abs(alert.points)} pts deducted. The Chicken has spoken.`,
          cls: "border-white/30 bg-[var(--color-alert)] text-white",
          duration: 5000,
        };
      }
      return {
        emoji: "🐔",
        text: `+${alert.points} pts — ${alert.name} approved!`,
        cls: "border-white/30 bg-gradient-to-r from-green-600 to-[var(--color-gold)] text-white",
        duration: 4000,
      };
    case "rejected":
      return {
        emoji: "❌",
        text: `Rejected — ${alert.reason?.trim() || "no reason given"}`,
        cls: "border-white/30 bg-amber-500 text-white",
        duration: 4000,
      };
    case "message":
      return {
        emoji: "💬",
        text: `Message from the Chicken: ${alert.preview}${alert.preview.length >= 40 ? "…" : ""}`,
        cls: "border-white/20 bg-[#0f172a] text-white",
        duration: 5000,
      };
  }
}

/**
 * Full-width banner that slides in from the top and overlays everything,
 * including the bottom nav and whatever tab the team is on. Tapping dismisses
 * it (message alerts open the chat instead).
 */
export function AlertBanner({
  alert,
  onDismiss,
  onOpenChat,
}: {
  alert: GameAlert;
  onDismiss: () => void;
  onOpenChat: () => void;
}) {
  const v = viewFor(alert);

  // Auto-dismiss after the kind's duration; re-armed for each new alert.
  useEffect(() => {
    const id = setTimeout(onDismiss, v.duration);
    return () => clearTimeout(id);
  }, [alert.id, v.duration, onDismiss]);

  return (
    <div className="fixed inset-x-0 top-0 z-[100] px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <button
        onClick={() => (alert.kind === "message" ? onOpenChat() : onDismiss())}
        className={`animate-slide-down flex w-full items-center gap-3 rounded-2xl border-4 px-4 py-4 text-left shadow-2xl ${v.cls}`}
      >
        <span className="shrink-0 text-3xl">{v.emoji}</span>
        <span className="font-display text-lg font-extrabold leading-tight">{v.text}</span>
      </button>
    </div>
  );
}

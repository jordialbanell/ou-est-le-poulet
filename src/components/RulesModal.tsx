import { POINTS_TO_WIN } from "../lib/data";
import type { WinStatus } from "../lib/scoring";

const RULES: string[] = [
  "🐔 The Chicken is hiding in one of ~37 bars across 3 zones.",
  "🍺 Check in at every bar you drink at. You must visit at least one bar in each of Zones A, B and C.",
  "🎯 Complete challenges for points. Submit photo/video evidence — the Chicken approves each one before points count.",
  "🥇 First 6 bars of the night are mandatory drinks for the whole team.",
  "⚔️ Team-vs-Team challenges are worth bonus points — challenge your rivals!",
  "🏆 First team to meet the win conditions can sit down with the Chicken and claim the cash prize.",
];

export function RulesModal({
  status,
  onClose,
}: {
  status: WinStatus;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="animate-slide-down relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-2 border-black/10 bg-[var(--color-paper)] p-6 shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-extrabold">📜 Rules &amp; Win Conditions</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/10 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Win conditions with live progress */}
        <div
          className={`mb-5 rounded-2xl border-2 p-4 ${
            status.canSitDown
              ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10"
              : "border-black/10 bg-white/60"
          }`}
        >
          <p className="font-display mb-3 text-lg font-bold">
            {status.canSitDown ? "You can sit down! 🍗" : "To sit down you need:"}
          </p>
          <ul className="flex flex-col gap-2">
            <Condition met={status.zonesVisited.size === 3}>
              Visit all 3 zones ({status.zonesVisited.size}/3)
            </Condition>
            <Condition met={status.totalPoints >= POINTS_TO_WIN}>
              Earn {POINTS_TO_WIN} points ({status.totalPoints}/{POINTS_TO_WIN})
            </Condition>
          </ul>
          {!status.canSitDown && status.missingConditions.length > 0 && (
            <div className="mt-3 border-t border-black/10 pt-3">
              {status.missingConditions.map((m) => (
                <p key={m} className="text-sm font-semibold text-[var(--color-alert)]">
                  → {m}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* How to play */}
        <h3 className="font-display mb-2 text-sm font-bold uppercase tracking-widest opacity-60">
          How to play
        </h3>
        <ul className="flex flex-col gap-2.5">
          {RULES.map((r) => (
            <li key={r} className="text-sm font-medium leading-snug">
              {r}
            </li>
          ))}
        </ul>

        <button
          onClick={onClose}
          className="font-display mt-6 min-h-[52px] w-full rounded-2xl bg-[var(--color-gold)] text-lg font-extrabold uppercase tracking-wide text-white transition active:scale-[0.98]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function Condition({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
          met ? "bg-green-600" : "bg-black/20"
        }`}
      >
        {met ? "✓" : "•"}
      </span>
      <span className={`font-semibold ${met ? "" : "opacity-70"}`}>{children}</span>
    </li>
  );
}

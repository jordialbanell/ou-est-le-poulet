import { useEffect } from "react";
import confetti from "canvas-confetti";

export function WinBanner({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const end = Date.now() + 2500;
    const colors = ["#C8860A", "#E9A81F", "#C0392B", "#2E7D32", "#1565C0"];

    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    // Big initial burst, then streamers.
    confetti({ particleCount: 160, spread: 100, origin: { y: 0.6 }, colors });
    frame();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
      <div className="animate-pop w-full max-w-sm rounded-3xl border-4 border-[var(--color-gold)] bg-[var(--color-paper)] p-8 text-center shadow-2xl">
        <div className="mb-2 text-7xl">🍗</div>
        <h2 className="font-display text-3xl font-extrabold uppercase leading-tight">
          You can sit down!
        </h2>
        <p className="mt-3 font-semibold opacity-70">
          All three zones visited and 20 points earned. Find the Chicken, sit down, and claim the prize!
        </p>
        <button
          onClick={onClose}
          className="font-display mt-6 min-h-[52px] w-full rounded-2xl bg-[var(--color-gold)] text-lg font-extrabold uppercase tracking-wide text-white transition active:scale-[0.98]"
        >
          Let's go 🏃
        </button>
      </div>
    </div>
  );
}

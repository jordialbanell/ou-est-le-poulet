import { useState } from "react";
import { MediaUpload } from "./MediaUpload";

/** Drink-photo gate shown when checking into one of the first 6 bars. */
export function CheckInModal({
  barName,
  barNumber,
  onCancel,
  onConfirm,
}: {
  barName: string;
  barNumber: number; // 1-based: which bar of the night this is
  onCancel: () => void;
  onConfirm: (
    evidenceUrl: string | null,
    note: string,
    whatsappEvidence: boolean,
  ) => Promise<void>;
}) {
  const [evidence, setEvidence] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [whatsapp, setWhatsapp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Need either an in-app photo or the WhatsApp confirmation to check in.
  const canSubmit = !!evidence || whatsapp;

  async function confirm() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(evidence, note, whatsapp);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check-in failed.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={busy ? undefined : onCancel} />
      <div className="animate-slide-down relative w-full max-w-md rounded-t-3xl border-2 border-[var(--color-gold)] bg-[var(--color-paper)] p-6 shadow-2xl sm:rounded-3xl">
        <p className="font-display text-xl font-extrabold leading-tight">📸 First 6 bars require a drink photo!</p>
        <p className="mt-1 text-sm font-semibold opacity-60">
          Bar {barNumber} of 6 · {barName}
        </p>

        <div className="mt-4">
          <MediaUpload
            value={evidence}
            onUploaded={setEvidence}
            onBusyChange={setUploading}
            accept="image/*,video/*"
            label="Add drink photo / video"
          />
        </div>

        {/* Upload fallback: if Cloudinary is being flaky, confirm you sent it on WhatsApp. */}
        <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border-2 border-black/15 bg-white/70 px-3 py-2.5">
          <input
            type="checkbox"
            checked={whatsapp}
            onChange={(e) => setWhatsapp(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-gold)]"
          />
          <span className="text-sm font-semibold leading-snug">
            📲 Sent photo/video to the Chicken on WhatsApp
            <span className="mt-0.5 block text-xs font-normal opacity-60">
              Tick this if the upload won't go through — you can still check in.
            </span>
          </span>
        </label>

        <label className="mb-1 mt-4 block text-xs font-bold uppercase tracking-wide opacity-60">
          Who's drinking? (optional)
        </label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 200))}
          placeholder="Name your team's least reluctant drinker"
          className="w-full rounded-xl border-2 border-black/15 bg-white/70 px-3 py-2.5 text-base outline-none focus:border-[var(--color-gold)]"
        />

        {error && <p className="mt-3 text-sm font-semibold text-[var(--color-alert)]">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="font-display min-h-[52px] flex-1 rounded-2xl border-2 border-black/15 text-base font-bold uppercase tracking-wide transition active:scale-[0.98] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={!canSubmit || busy || uploading}
            className="font-display min-h-[52px] flex-[2] rounded-2xl bg-[var(--color-gold)] text-base font-extrabold uppercase tracking-wide text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            {uploading ? "Uploading…" : busy ? "Checking in…" : "Check In"}
          </button>
        </div>
      </div>
    </div>
  );
}

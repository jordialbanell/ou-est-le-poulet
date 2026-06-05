import { useEffect, useRef, useState } from "react";
import { isVideoUrl, uploadToCloudinary } from "../lib/cloudinary";

/** File picker + Cloudinary upload with progress, preview, and clear. */
export function MediaUpload({
  value,
  onUploaded,
  onBusyChange,
  accept = "image/*,video/*",
  label = "Add photo / video",
  compact = false,
}: {
  value: string | null;
  onUploaded: (url: string | null) => void;
  /** Fires while a file is uploading so the parent can disable its submit button. */
  onBusyChange?: (busy: boolean) => void;
  accept?: string;
  label?: string;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Report busy changes to the parent without re-firing when an inline
  // callback changes identity each render. Reset to false on unmount.
  const busyCb = useRef(onBusyChange);
  busyCb.current = onBusyChange;
  useEffect(() => {
    busyCb.current?.(busy);
  }, [busy]);
  useEffect(() => () => busyCb.current?.(false), []);

  async function onPick(file: File) {
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      const res = await uploadToCloudinary(file, setProgress);
      onUploaded(res.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onPick(f);
          e.target.value = ""; // allow re-picking the same file
        }}
      />

      {value ? (
        <div className="flex items-center gap-3">
          <Preview url={value} compact={compact} />
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="font-display rounded-lg border-2 border-black/15 px-3 py-1.5 text-xs font-bold uppercase disabled:opacity-50"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onUploaded(null)}
              disabled={busy}
              className="text-xs font-semibold text-[var(--color-alert)] underline disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="font-display min-h-[44px] rounded-xl border-2 border-dashed border-black/25 px-4 text-sm font-bold uppercase tracking-wide transition active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? "Uploading…" : `📎 ${label}`}
        </button>
      )}

      {busy && <UploadProgress progress={progress} />}

      {error && <p className="text-xs font-semibold text-[var(--color-alert)]">{error}</p>}
    </div>
  );
}

/**
 * Upload progress bar. Before the first progress event (i.e. while the image is
 * compressing / the request is warming up) it animates indeterminately; once
 * bytes start flowing it switches to a determinate bar with a percentage.
 */
function UploadProgress({ progress }: { progress: number }) {
  const started = progress > 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10">
        {started ? (
          <div
            className="h-full rounded-full bg-[var(--color-gold)] transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        ) : (
          <div className="h-full animate-indeterminate rounded-full bg-[var(--color-gold)]" />
        )}
      </div>
      <p className="text-xs font-semibold text-[var(--color-gold)]">
        Uploading… please wait{started ? ` ${progress}%` : ""}
      </p>
    </div>
  );
}

function Preview({ url, compact }: { url: string; compact: boolean }) {
  const size = compact ? "h-14 w-14" : "h-20 w-20";
  if (isVideoUrl(url)) {
    return (
      <video
        src={url}
        className={`${size} rounded-lg border-2 border-black/10 object-cover`}
        muted
        playsInline
      />
    );
  }
  return (
    <img
      src={url}
      alt="upload preview"
      className={`${size} rounded-lg border-2 border-black/10 object-cover`}
    />
  );
}

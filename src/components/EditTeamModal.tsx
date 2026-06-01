import { useState } from "react";
import { updateTeam } from "../lib/actions";
import type { Team } from "../lib/types";
import { MediaUpload } from "./MediaUpload";

export function EditTeamModal({
  team,
  onClose,
  onSaved,
}: {
  team: Team;
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const [name, setName] = useState(team.name);
  const [members, setMembers] = useState(team.members ?? "");
  const [selfieUrl, setSelfieUrl] = useState<string | null>(team.selfie_url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Team name can't be empty.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateTeam(team.id, { name: cleanName, members, selfie_url: selfieUrl });
      onSaved(cleanName);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="animate-slide-down relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-2 border-black/10 bg-[var(--color-paper)] p-6 shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-extrabold">Edit Team</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/10 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        <label className="mb-1 block text-xs font-bold uppercase tracking-wide opacity-60">
          Team Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 40))}
          className="mb-4 w-full rounded-2xl border-2 border-black/15 bg-white/70 px-4 py-3 text-lg font-semibold outline-none focus:border-[var(--color-gold)]"
        />

        <label className="mb-1 block text-xs font-bold uppercase tracking-wide opacity-60">
          Team Members
        </label>
        <input
          value={members}
          onChange={(e) => setMembers(e.target.value.slice(0, 200))}
          placeholder="Alex, Sam, Jordi…"
          className="mb-4 w-full rounded-2xl border-2 border-black/15 bg-white/70 px-4 py-3 text-base font-semibold outline-none focus:border-[var(--color-gold)]"
        />

        <label className="mb-1 block text-xs font-bold uppercase tracking-wide opacity-60">
          Team Selfie
        </label>
        <div className="mb-4">
          <MediaUpload
            value={selfieUrl}
            onUploaded={setSelfieUrl}
            accept="image/*"
            label="Take / upload selfie"
          />
        </div>

        {error && (
          <p className="mb-3 text-sm font-semibold text-[var(--color-alert)]">{error}</p>
        )}

        <button
          onClick={save}
          disabled={busy}
          className="font-display min-h-[52px] w-full rounded-2xl bg-[var(--color-gold)] text-lg font-extrabold uppercase tracking-wide text-white transition active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

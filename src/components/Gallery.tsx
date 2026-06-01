import { useMemo, useState } from "react";
import { isVideoUrl } from "../lib/cloudinary";
import type { BarCheckin, PendingChallenge, Team } from "../lib/types";

type ChallengeStatus = "pending" | "approved" | "rejected";

interface MediaItem {
  id: string;
  url: string;
  teamName: string;
  label: string;
  time: string;
  status?: ChallengeStatus;
}

const STATUS_STYLE: Record<ChallengeStatus, { label: string; cls: string }> = {
  approved: { label: "Approved", cls: "bg-green-600" },
  pending: { label: "Pending", cls: "bg-[var(--color-gold)]" },
  rejected: { label: "Rejected", cls: "bg-[var(--color-alert)]" },
};

export function Gallery({
  teams,
  pending,
  checkins,
}: {
  teams: Team[];
  pending: PendingChallenge[];
  checkins: BarCheckin[];
}) {
  const [lightbox, setLightbox] = useState<MediaItem | null>(null);

  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? "Unknown";

  const items = useMemo<MediaItem[]>(() => {
    const list: MediaItem[] = [];

    for (const p of pending) {
      if (!p.evidence_url) continue;
      list.push({
        id: `p-${p.id}`,
        url: p.evidence_url,
        teamName: teamName(p.team_id),
        label: p.challenge_name,
        time: p.submitted_at,
        status: p.status as ChallengeStatus,
      });
    }
    for (const c of checkins) {
      if (!c.checkin_evidence_url) continue;
      list.push({
        id: `c-${c.id}`,
        url: c.checkin_evidence_url,
        teamName: teamName(c.team_id),
        label: `Bar check-in: ${c.bar_name}`,
        time: c.checked_in_at,
      });
    }
    for (const t of teams) {
      if (!t.selfie_url) continue;
      list.push({
        id: `t-${t.id}`,
        url: t.selfie_url,
        teamName: t.name,
        label: "Team selfie",
        time: t.created_at,
      });
    }

    return list.sort((a, b) => b.time.localeCompare(a.time));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams, pending, checkins]);

  return (
    <section className="rounded-2xl border-2 border-black/10 bg-white/50 p-4">
      <h2 className="font-display mb-3 text-sm font-bold uppercase tracking-widest opacity-60">
        Gallery 📸
      </h2>

      {items.length === 0 ? (
        <p className="text-sm opacity-60">
          No photos yet. They're either very bad at this or very good at deleting evidence.
        </p>
      ) : (
        <div className="columns-2 gap-2 sm:columns-3">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setLightbox(item)}
              className="mb-2 block w-full break-inside-avoid overflow-hidden rounded-xl border-2 border-black/10 bg-black/5 text-left"
            >
              <div className="relative">
                {isVideoUrl(item.url) ? (
                  <>
                    <video src={item.url} preload="metadata" muted playsInline className="w-full" />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-lg text-white">
                        ▶
                      </span>
                    </span>
                  </>
                ) : (
                  <img src={item.url} alt={item.label} loading="lazy" className="w-full" />
                )}
                {item.status && (
                  <span
                    className={`absolute right-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white ${STATUS_STYLE[item.status].cls}`}
                  >
                    {STATUS_STYLE[item.status].label}
                  </span>
                )}
              </div>
              <p className="px-2 py-1.5 text-xs font-semibold leading-snug">
                <span className="font-bold">{item.teamName}</span>
                <span className="opacity-60"> · {item.label}</span>
              </p>
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[55] flex flex-col items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            aria-label="Close"
            className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl font-bold text-white"
          >
            ✕
          </button>
          <div className="max-h-[80vh] w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            {isVideoUrl(lightbox.url) ? (
              <video src={lightbox.url} controls autoPlay playsInline className="max-h-[80vh] w-full rounded-lg" />
            ) : (
              <img src={lightbox.url} alt={lightbox.label} className="max-h-[80vh] w-full rounded-lg object-contain" />
            )}
          </div>
          <p className="mt-3 text-center text-sm font-semibold text-white">
            <span className="font-bold">{lightbox.teamName}</span>
            <span className="opacity-70"> · {lightbox.label}</span>
          </p>
        </div>
      )}
    </section>
  );
}

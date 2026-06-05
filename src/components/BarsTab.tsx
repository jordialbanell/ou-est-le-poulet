import { useEffect, useMemo, useState } from "react";
import { BARS, ZONE_ORDER, ZONES, type Bar, type Zone } from "../lib/data";
import { checkInBar, undoCheckIn } from "../lib/actions";
import type { BarCheckin } from "../lib/types";
import { CheckInModal } from "./CheckInModal";
import { useToast } from "./Toast";

const PHOTO_REQUIRED_BARS = 6;

const mapsUrl = (barName: string) =>
  `https://www.google.com/maps/search/${encodeURIComponent(`${barName} Singapore`)}`;

export function BarsTab({
  gameId,
  teamId,
  checkins,
}: {
  gameId: string;
  teamId: string;
  checkins: BarCheckin[];
}) {
  const toast = useToast();
  const [openZones, setOpenZones] = useState<Set<Zone>>(new Set<Zone>(["A"]));
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<Set<string>>(new Set());
  // Optimistic overrides while a write is in flight. The value mirrors the row
  // we're writing: `true` = approved (instant bar 7+), `"pending"` = first-6
  // awaiting approval, `false` = checking out.
  const [override, setOverride] = useState<Record<string, boolean | "pending">>({});
  // Bar awaiting a drink photo before its check-in completes.
  const [photoFor, setPhotoFor] = useState<{ name: string; zone: Zone } | null>(null);

  // bar name -> this team's checkin row (if any)
  const myCheckins = useMemo(() => {
    const map = new Map<string, BarCheckin>();
    for (const c of checkins) if (c.team_id === teamId) map.set(c.bar_name, c);
    return map;
  }, [checkins, teamId]);

  // Effective checked state (any status) = optimistic override if present, else
  // server truth. Used for the photo gate, checkout, and sorting.
  const isChecked = (barName: string) => override[barName] ?? myCheckins.has(barName);

  // A pending first-6 check-in awaiting the Chicken's approval.
  const isPending = (barName: string) => {
    const ov = override[barName];
    if (ov !== undefined) return ov === "pending";
    return myCheckins.get(barName)?.status === "pending";
  };

  // Counts toward the zone's visited badge — approved only (pending doesn't count).
  const isVisited = (barName: string) => {
    const ov = override[barName];
    if (ov !== undefined) return ov === true;
    const row = myCheckins.get(barName);
    return !!row && row.status !== "pending";
  };

  // How many bars this team has checked into so far (any status) — keeps the
  // "first 6 require a photo" gate stable even while approvals are pending.
  const checkedCount = BARS.filter((b) => isChecked(b.name)).length;

  // Active search query (case-insensitive substring on bar name). When set, the
  // zone grouping is flattened into a single matching list.
  const q = query.trim().toLowerCase();
  const matches = q ? BARS.filter((b) => b.name.toLowerCase().includes(q)) : [];

  // Once the server (via realtime) agrees with an override, drop the override.
  useEffect(() => {
    setOverride((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [name, want] of Object.entries(prev)) {
        const row = myCheckins.get(name);
        const settled =
          want === false
            ? !row // checkout: row is gone
            : want === "pending"
              ? row?.status === "pending" // pending row landed
              : !!row && row.status !== "pending"; // approved row landed
        if (settled) {
          delete next[name];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [myCheckins]);

  /** Optimistically check in (with optional drink evidence) and persist. */
  async function doCheckIn(
    barName: string,
    zone: Zone,
    evidenceUrl?: string | null,
    note?: string,
    status?: "pending" | "approved",
    whatsappEvidence?: boolean,
  ) {
    setBusy((s) => new Set(s).add(barName));
    // Optimistic state must match the status we're writing.
    setOverride((o) => ({ ...o, [barName]: status === "pending" ? "pending" : true }));
    try {
      await checkInBar(gameId, teamId, barName, zone, evidenceUrl, note, status, whatsappEvidence);
      toast(
        status === "pending"
          ? `Sent to the Chicken for approval 🍺`
          : `Checked in at ${barName} 🍺`,
        "success",
      );
    } catch (e) {
      setOverride((o) => ({ ...o, [barName]: false }));
      toast(e instanceof Error ? e.message : "Check-in failed.", "error");
      throw e;
    } finally {
      setBusy((s) => {
        const n = new Set(s);
        n.delete(barName);
        return n;
      });
    }
  }

  async function toggle(barName: string, zone: Zone) {
    if (busy.has(barName)) return;
    const current = isChecked(barName);

    if (!current) {
      // Checking IN — first 6 bars require a drink photo.
      if (checkedCount < PHOTO_REQUIRED_BARS) {
        setPhotoFor({ name: barName, zone });
        return;
      }
      await doCheckIn(barName, zone).catch(() => {});
      return;
    }

    // Checking OUT — immediate, no photo.
    setBusy((s) => new Set(s).add(barName));
    setOverride((o) => ({ ...o, [barName]: false }));
    try {
      const existing = myCheckins.get(barName);
      if (existing) await undoCheckIn(existing.id);
    } catch (e) {
      setOverride((o) => ({ ...o, [barName]: true }));
      toast(e instanceof Error ? e.message : "Could not undo check-in.", "error");
    } finally {
      setBusy((s) => {
        const n = new Set(s);
        n.delete(barName);
        return n;
      });
    }
  }

  return (
    <div className="flex flex-col gap-3 px-4 pb-6 pt-4">
      <h2 className="font-display text-2xl font-extrabold">Bars</h2>
      <p className="-mt-1 text-sm opacity-60">Check in everywhere you drink. One in each zone to win.</p>

      {/* Search — filters across all zones; clearing restores the grouped view. */}
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search bars by name…"
          className="w-full rounded-xl border-2 border-black/15 bg-white/70 py-2 pl-3 pr-9 text-sm outline-none focus:border-[var(--color-gold)]"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-lg opacity-50 transition active:scale-90"
          >
            ✕
          </button>
        )}
      </div>

      {q ? (
        // Active search — flat list across every zone, each tagged with its zone.
        matches.length === 0 ? (
          <p className="py-6 text-center text-sm opacity-60">No bars match “{query.trim()}”.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border-2 border-black/10 bg-white/50">
            <ul>
              {matches.map((bar) => (
                <BarRow
                  key={bar.name}
                  bar={bar}
                  checked={!!isChecked(bar.name)}
                  pending={isPending(bar.name)}
                  isBusy={busy.has(bar.name)}
                  onToggle={() => toggle(bar.name, bar.zone)}
                  showZone
                />
              ))}
            </ul>
          </div>
        )
      ) : (
        ZONE_ORDER.map((zone) => {
        const zoneBars = BARS.filter((b) => b.zone === zone);
        const visitedCount = zoneBars.filter((b) => isVisited(b.name)).length;
        const open = openZones.has(zone);
        // Visited bars sink to the bottom.
        const sorted = [...zoneBars].sort((a, b) => {
          const av = isChecked(a.name) ? 1 : 0;
          const bv = isChecked(b.name) ? 1 : 0;
          return av - bv;
        });

        return (
          <div
            key={zone}
            className="overflow-hidden rounded-2xl border-2 border-black/10 bg-white/50"
          >
            <button
              onClick={() =>
                setOpenZones((s) => {
                  const n = new Set(s);
                  n.has(zone) ? n.delete(zone) : n.add(zone);
                  return n;
                })
              }
              className="flex w-full items-center justify-between px-4 py-4 text-left"
            >
              <div className="flex items-center gap-3">
                <span
                  className="font-display flex h-9 w-9 items-center justify-center rounded-full text-base font-bold text-white"
                  style={{ backgroundColor: ZONES[zone].color }}
                >
                  {zone}
                </span>
                <div>
                  <p className="font-display font-bold leading-tight">{ZONES[zone].label}</p>
                  <p className="text-xs opacity-60">{ZONES[zone].description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-bold text-white"
                  style={{ backgroundColor: visitedCount > 0 ? ZONES[zone].color : "rgba(0,0,0,0.25)" }}
                >
                  {visitedCount}/{zoneBars.length}
                </span>
                <span className={`text-lg transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
              </div>
            </button>

            {open && (
              <ul className="border-t border-black/10">
                {sorted.map((bar) => (
                  <BarRow
                    key={bar.name}
                    bar={bar}
                    checked={!!isChecked(bar.name)}
                    pending={isPending(bar.name)}
                    isBusy={busy.has(bar.name)}
                    onToggle={() => toggle(bar.name, zone)}
                  />
                ))}
              </ul>
            )}
          </div>
        );
      })
      )}

      {photoFor && (
        <CheckInModal
          barName={photoFor.name}
          barNumber={checkedCount + 1}
          onCancel={() => setPhotoFor(null)}
          onConfirm={async (evidenceUrl, note, whatsappEvidence) => {
            // First-6 check-ins require the Chicken's approval — whether the
            // evidence is an in-app photo or confirmed-on-WhatsApp.
            await doCheckIn(
              photoFor.name,
              photoFor.zone,
              evidenceUrl,
              note,
              "pending",
              whatsappEvidence,
            );
            setPhotoFor(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * One bar row — used both in the grouped zone view and the flat search results.
 * `showZone` adds a zone pill (search results span all zones). All per-bar
 * behaviour (check-in toggle, ⏳ pending marker, Map link) is identical either way.
 */
function BarRow({
  bar,
  checked,
  pending,
  isBusy,
  onToggle,
  showZone = false,
}: {
  bar: Bar;
  checked: boolean;
  pending: boolean;
  isBusy: boolean;
  onToggle: () => void;
  showZone?: boolean;
}) {
  return (
    <li className="flex items-stretch border-b border-black/5">
      <button
        onClick={onToggle}
        disabled={isBusy}
        className="flex min-h-[56px] min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left transition active:bg-black/5 disabled:opacity-50"
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-bold transition ${
            pending
              ? "border-[var(--color-gold)] text-[var(--color-gold)]"
              : checked
                ? "border-transparent text-white"
                : "border-black/25 text-transparent"
          }`}
          style={checked && !pending ? { backgroundColor: ZONES[bar.zone].color } : undefined}
        >
          {pending ? "⏳" : "✓"}
        </span>
        <span className="min-w-0">
          <span
            className={`font-semibold ${checked && !pending ? "line-through opacity-50" : ""}`}
          >
            {bar.name}
          </span>
          {showZone && (
            <span
              className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
              style={{ backgroundColor: ZONES[bar.zone].color }}
            >
              Zone {bar.zone}
            </span>
          )}
          {pending && (
            <span className="font-display ml-2 rounded-full bg-[var(--color-gold)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-gold)]">
              ⏳ Pending approval
            </span>
          )}
        </span>
      </button>
      <a
        href={mapsUrl(bar.name)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${bar.name} in Google Maps`}
        className="flex min-h-[56px] shrink-0 items-center gap-1 border-l border-black/5 px-3 text-xs font-bold text-[var(--color-zone-a)] transition active:bg-black/5"
      >
        📍 Map
      </a>
    </li>
  );
}

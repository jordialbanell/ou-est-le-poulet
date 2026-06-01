import { useEffect, useMemo, useState } from "react";
import { BARS, ZONE_ORDER, ZONES, type Zone } from "../lib/data";
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
  const [busy, setBusy] = useState<Set<string>>(new Set());
  // Optimistic overrides: bar name -> desired checked state while a write is in flight.
  const [override, setOverride] = useState<Record<string, boolean>>({});
  // Bar awaiting a drink photo before its check-in completes.
  const [photoFor, setPhotoFor] = useState<{ name: string; zone: Zone } | null>(null);

  // bar name -> this team's checkin row (if any)
  const myCheckins = useMemo(() => {
    const map = new Map<string, BarCheckin>();
    for (const c of checkins) if (c.team_id === teamId) map.set(c.bar_name, c);
    return map;
  }, [checkins, teamId]);

  // Effective checked state = optimistic override if present, else server truth.
  const isChecked = (barName: string) => override[barName] ?? myCheckins.has(barName);

  // How many bars this team has checked into so far (effective, optimistic-aware).
  const checkedCount = BARS.filter((b) => isChecked(b.name)).length;

  // Once the server (via realtime) agrees with an override, drop the override.
  useEffect(() => {
    setOverride((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [name, want] of Object.entries(prev)) {
        if (myCheckins.has(name) === want) {
          delete next[name];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [myCheckins]);

  /** Optimistically check in (with optional drink evidence) and persist. */
  async function doCheckIn(barName: string, zone: Zone, evidenceUrl?: string, note?: string) {
    setBusy((s) => new Set(s).add(barName));
    setOverride((o) => ({ ...o, [barName]: true }));
    try {
      await checkInBar(gameId, teamId, barName, zone, evidenceUrl, note);
      toast(`Checked in at ${barName} 🍺`, "success");
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

      {ZONE_ORDER.map((zone) => {
        const zoneBars = BARS.filter((b) => b.zone === zone);
        const visitedCount = zoneBars.filter((b) => isChecked(b.name)).length;
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
                {sorted.map((bar) => {
                  const checked = isChecked(bar.name);
                  const isBusy = busy.has(bar.name);
                  return (
                    <li key={bar.name} className="flex items-stretch border-b border-black/5">
                      <button
                        onClick={() => toggle(bar.name, zone)}
                        disabled={isBusy}
                        className="flex min-h-[56px] min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left transition active:bg-black/5 disabled:opacity-50"
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-bold transition ${
                            checked
                              ? "border-transparent text-white"
                              : "border-black/25 text-transparent"
                          }`}
                          style={checked ? { backgroundColor: ZONES[zone].color } : undefined}
                        >
                          ✓
                        </span>
                        <span
                          className={`font-semibold ${checked ? "line-through opacity-50" : ""}`}
                        >
                          {bar.name}
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
                })}
              </ul>
            )}
          </div>
        );
      })}

      {photoFor && (
        <CheckInModal
          barName={photoFor.name}
          barNumber={checkedCount + 1}
          onCancel={() => setPhotoFor(null)}
          onConfirm={async (evidenceUrl, note) => {
            await doCheckIn(photoFor.name, photoFor.zone, evidenceUrl, note);
            setPhotoFor(null);
          }}
        />
      )}
    </div>
  );
}

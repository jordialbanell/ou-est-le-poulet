import { useMemo, useState } from "react";
import { APIProvider, Map as GoogleMap, Marker, InfoWindow } from "@vis.gl/react-google-maps";
import { ZONES, type Bar, type Zone } from "../lib/data";
import type { Team, TeamLocation } from "../lib/types";
import { setAllTeamsLocationVisible, setTeamLocationVisible } from "../lib/actions";
import { useToast } from "./Toast";
import { BAR_PINS, MAP_CENTER, circleIcon, circularAvatar, mapsUrl, poopIcon } from "./mapShared";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

/**
 * Admin LIVE MAP — all 37 bars plus every team's live pin, updating in real time
 * via the teams + team_locations Realtime subscriptions in useGame. Each team can
 * be hidden from both this map and the player map with a per-team toggle.
 *
 * Note: the admin never writes to team_locations (no GPS tracking on /admin), so
 * the admin's own device never appears here. We also skip any location row whose
 * team_id doesn't match a real team in this game.
 */
export function AdminMap({
  teams,
  teamLocations,
  onChanged,
}: {
  teams: Team[];
  teamLocations: TeamLocation[];
  /** Re-fetch teams so the map + toggles reflect the new visibility instantly. */
  onChanged: () => void;
}) {
  const toast = useToast();
  const [selected, setSelected] = useState<{ bar: Bar; pos: google.maps.LatLngLiteral } | null>(null);
  // Optimistic overrides so a toggle flips instantly before Realtime catches up.
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const teamById = useMemo(() => {
    const m = new Map<string, Team>();
    for (const t of teams) m.set(t.id, t);
    return m;
  }, [teams]);

  // Latest location per team (rows can have history; keep the freshest).
  const latestByTeam = useMemo(() => {
    const m = new Map<string, TeamLocation>();
    for (const loc of teamLocations) {
      const prev = m.get(loc.team_id);
      if (!prev || loc.updated_at > prev.updated_at) m.set(loc.team_id, loc);
    }
    return m;
  }, [teamLocations]);

  const isVisible = (t: Team) => pending[t.id] ?? t.location_visible !== false;

  async function toggle(team: Team) {
    const next = !isVisible(team);
    setPending((p) => ({ ...p, [team.id]: next }));
    try {
      await setTeamLocationVisible(team.id, next);
      onChanged();
    } catch (e) {
      setPending((p) => {
        const n = { ...p };
        delete n[team.id];
        return n;
      });
      toast(e instanceof Error ? e.message : "Could not update visibility.", "error");
    }
  }

  async function setAll(visible: boolean) {
    const ids = teams.map((t) => t.id);
    setPending((p) => {
      const n = { ...p };
      for (const id of ids) n[id] = visible;
      return n;
    });
    try {
      await setAllTeamsLocationVisible(ids, visible);
      onChanged();
      toast(visible ? "All locations shown" : "All locations hidden", "success");
    } catch (e) {
      setPending({});
      toast(e instanceof Error ? e.message : "Could not update visibility.", "error");
    }
  }

  if (!API_KEY) {
    return (
      <section className="rounded-2xl border-2 border-black/10 bg-white/50 p-4">
        <h2 className="font-display mb-2 text-sm font-bold uppercase tracking-widest opacity-60">
          Live Map
        </h2>
        <p className="text-sm opacity-60">VITE_GOOGLE_MAPS_API_KEY is missing from .env.</p>
      </section>
    );
  }

  const allVisible = teams.length > 0 && teams.every(isVisible);

  return (
    <section className="rounded-2xl border-2 border-black/10 bg-white/50 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-sm font-bold uppercase tracking-widest opacity-60">
          Live Map
        </h2>
        {teams.length > 0 && (
          <button
            onClick={() => setAll(!allVisible)}
            className="font-display rounded-lg border-2 border-black/15 px-3 py-1 text-xs font-bold uppercase tracking-wide"
          >
            {allVisible ? "🙈 Hide all locations" : "👁 Show all locations"}
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border-2 border-black/10" style={{ height: 360 }}>
        <APIProvider apiKey={API_KEY}>
          <GoogleMap
            defaultCenter={MAP_CENTER}
            defaultZoom={16}
            gestureHandling="greedy"
            clickableIcons={false}
            style={{ width: "100%", height: "100%" }}
          >
            {/* Bar markers, colour-coded by zone */}
            {BAR_PINS.map(({ bar, pos }) => (
              <Marker
                key={bar.name}
                position={pos}
                icon={circleIcon(ZONES[bar.zone].color)}
                title={bar.name}
                onClick={() => setSelected({ bar, pos })}
              />
            ))}

            {/* Live team pins — skip unknown teams and admin-hidden ones */}
            {[...latestByTeam.values()].map((loc) => {
              const team = teamById.get(loc.team_id);
              if (!team || !isVisible(team)) return null;
              return (
                <Marker
                  key={loc.team_id}
                  position={{ lat: loc.lat, lng: loc.lng }}
                  icon={team.selfie_url ? circularAvatar(team.selfie_url, 40) : poopIcon()}
                  zIndex={1000}
                  label={{
                    text: team.name,
                    className: "oelp-team-label",
                    color: "#1a1a1a",
                    fontSize: "11px",
                    fontWeight: "700",
                  }}
                />
              );
            })}

            {selected && (
              <InfoWindow position={selected.pos} onCloseClick={() => setSelected(null)}>
                <div style={{ minWidth: 140 }}>
                  <strong>{selected.bar.name}</strong>
                  <br />
                  {ZONES[selected.bar.zone].label}
                  <br />
                  <a
                    href={mapsUrl(selected.bar.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#1565C0", fontWeight: 600 }}
                  >
                    Open in Google Maps →
                  </a>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </APIProvider>
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
        {(["A", "B", "C"] as Zone[]).map((z) => (
          <span key={z} className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: ZONES[z].color }} />
            {ZONES[z].label}
          </span>
        ))}
      </div>

      {/* Per-team "show on map" toggles */}
      <div className="mt-3 flex flex-col gap-2 border-t border-black/10 pt-3">
        {teams.length === 0 && <p className="text-sm opacity-60">No teams yet.</p>}
        {teams.map((t) => {
          const visible = isVisible(t);
          const hasLocation = latestByTeam.has(t.id);
          return (
            <div key={t.id} className="flex items-center gap-3">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
              <span className="font-display min-w-0 flex-1 truncate font-bold">
                {t.name}
                {!hasLocation && (
                  <span className="ml-1.5 text-[11px] font-semibold opacity-40">no GPS yet</span>
                )}
              </span>
              <button
                onClick={() => toggle(t)}
                role="switch"
                aria-checked={visible}
                aria-label={`Show ${t.name} on map`}
                className={`relative h-6 w-11 shrink-0 rounded-full border-2 transition ${
                  visible
                    ? "border-green-600 bg-green-600"
                    : "border-black/20 bg-black/10"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                    visible ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

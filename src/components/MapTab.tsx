import { useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { BARS, SINGAPORE_CENTER, ZONES, barPosition, type Zone } from "../lib/data";
import type { Team, TeamLocation } from "../lib/types";
import type { GeoStatus } from "../hooks/useGeoTracking";

const mapsUrl = (barName: string) =>
  `https://www.google.com/maps/search/${encodeURIComponent(`${barName} Singapore`)}`;

function barIcon(zone: Zone) {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:${ZONES[zone].color};color:#fff;font-size:14px;box-shadow:0 1px 4px rgba(0,0,0,.4);border:2px solid #fff">🍺</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function teamIcon(team: Team, isMe: boolean) {
  const initial = team.name.trim().charAt(0).toUpperCase() || "?";
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:${team.color};color:#fff;font-weight:700;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,.5);border:3px solid ${isMe ? "#fff" : "rgba(255,255,255,.6)"}">${initial}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

const GEO_LABEL: Record<GeoStatus, string> = {
  idle: "Starting GPS…",
  tracking: "📍 Sharing your location",
  denied: "Location blocked — enable GPS to appear on the map",
  unavailable: "GPS not available on this device",
  error: "Couldn't read your location",
};

export function MapTab({
  teams,
  teamLocations,
  currentTeamId,
  geoStatus,
}: {
  teams: Team[];
  teamLocations: TeamLocation[];
  currentTeamId: string;
  geoStatus: GeoStatus;
}) {
  // Pre-compute a stable position for every bar.
  const barPins = useMemo(() => {
    const perZone: Record<Zone, number> = { A: 0, B: 0, C: 0 };
    return BARS.map((bar) => {
      const idx = perZone[bar.zone]++;
      return { bar, pos: barPosition(bar.zone, idx) };
    });
  }, []);

  const teamById = useMemo(() => {
    const m = new Map<string, Team>();
    for (const t of teams) m.set(t.id, t);
    return m;
  }, [teams]);

  // Latest location per team.
  const latestByTeam = useMemo(() => {
    const m = new Map<string, TeamLocation>();
    for (const loc of teamLocations) {
      const prev = m.get(loc.team_id);
      if (!prev || loc.updated_at > prev.updated_at) m.set(loc.team_id, loc);
    }
    return m;
  }, [teamLocations]);

  return (
    <div className="flex flex-col gap-3 px-4 pb-6 pt-4">
      <h2 className="font-display text-2xl font-extrabold">Map</h2>
      <p
        className={`-mt-1 text-sm font-semibold ${
          geoStatus === "denied" || geoStatus === "error" ? "text-[var(--color-alert)]" : "opacity-60"
        }`}
      >
        {GEO_LABEL[geoStatus]}
      </p>

      <div className="overflow-hidden rounded-2xl border-2 border-black/10" style={{ height: "calc(100dvh - 16rem)" }}>
        <MapContainer
          center={[SINGAPORE_CENTER.lat, SINGAPORE_CENTER.lng]}
          zoom={16}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {barPins.map(({ bar, pos }) => (
            <Marker key={bar.name} position={[pos.lat, pos.lng]} icon={barIcon(bar.zone)}>
              <Popup>
                <strong>{bar.name}</strong>
                <br />
                {ZONES[bar.zone].label}
                <br />
                <a
                  href={mapsUrl(bar.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#1565C0", fontWeight: 600 }}
                >
                  Open in Google Maps →
                </a>
              </Popup>
            </Marker>
          ))}

          {[...latestByTeam.values()].map((loc) => {
            const team = teamById.get(loc.team_id);
            if (!team) return null;
            const isMe = team.id === currentTeamId;
            return (
              <Marker
                key={loc.team_id}
                position={[loc.lat, loc.lng]}
                icon={teamIcon(team, isMe)}
                zIndexOffset={1000}
              >
                <Popup>
                  <strong>{team.name}</strong>
                  {isMe ? " (you)" : ""}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs font-semibold">
        {(["A", "B", "C"] as Zone[]).map((z) => (
          <span key={z} className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: ZONES[z].color }} />
            {ZONES[z].label}
          </span>
        ))}
        <span className="opacity-60">Bar pins are approximate within each zone.</span>
      </div>
    </div>
  );
}

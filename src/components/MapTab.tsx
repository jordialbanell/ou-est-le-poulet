import { useEffect, useMemo, useState } from "react";
import { APIProvider, Map as GoogleMap, Marker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import { ZONES, type Bar, type Zone } from "../lib/data";
import type { Team, TeamLocation } from "../lib/types";
import type { GeoStatus } from "../hooks/useGeoTracking";
import { BAR_PINS, MAP_CENTER, circleIcon, circularAvatar, mapsUrl, poopIcon } from "./mapShared";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

/** Pans the map when a target position is set (e.g. after "Find Me"). */
function Recenter({ pos }: { pos: google.maps.LatLngLiteral | null }) {
  const map = useMap();
  useEffect(() => {
    if (map && pos) {
      map.panTo(pos);
      map.setZoom(17);
    }
  }, [map, pos]);
  return null;
}

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
  const [selected, setSelected] = useState<{ bar: Bar; pos: google.maps.LatLngLiteral } | null>(null);
  const [userPos, setUserPos] = useState<google.maps.LatLngLiteral | null>(null);
  const [findError, setFindError] = useState<string | null>(null);
  const [finding, setFinding] = useState(false);

  const teamById = useMemo(() => {
    const m = new Map<string, Team>();
    for (const t of teams) m.set(t.id, t);
    return m;
  }, [teams]);

  const latestByTeam = useMemo(() => {
    const m = new Map<string, TeamLocation>();
    for (const loc of teamLocations) {
      const prev = m.get(loc.team_id);
      if (!prev || loc.updated_at > prev.updated_at) m.set(loc.team_id, loc);
    }
    return m;
  }, [teamLocations]);

  function findMe() {
    if (!navigator.geolocation) {
      setFindError("GPS not available on this device.");
      return;
    }
    setFinding(true);
    setFindError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setFinding(false);
      },
      (err) => {
        setFindError(
          err.code === err.PERMISSION_DENIED
            ? "Location blocked — enable GPS for this site."
            : "Couldn't get your location.",
        );
        setFinding(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  if (!API_KEY) {
    return (
      <div className="px-4 pt-10 text-center">
        <p className="font-display text-lg font-bold">Map unavailable</p>
        <p className="text-sm opacity-60">VITE_GOOGLE_MAPS_API_KEY is missing from .env.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-4 pb-6 pt-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-2xl font-extrabold">Map</h2>
        <button
          onClick={findMe}
          disabled={finding}
          className="font-display rounded-xl bg-[var(--color-gold)] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white transition active:scale-95 disabled:opacity-60"
        >
          {finding ? "Locating…" : "📍 Find Me"}
        </button>
      </div>
      {findError && <p className="-mt-1 text-sm font-semibold text-[var(--color-alert)]">{findError}</p>}
      {geoStatus === "denied" && !findError && (
        <p className="-mt-1 text-sm font-semibold text-[var(--color-alert)]">
          Location blocked — enable GPS to share your spot.
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border-2 border-black/10" style={{ height: "calc(100dvh - 16rem)" }}>
        <APIProvider apiKey={API_KEY}>
          <GoogleMap
            defaultCenter={MAP_CENTER}
            defaultZoom={16}
            gestureHandling="greedy"
            disableDefaultUI={false}
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

            {/* Team live locations */}
            {[...latestByTeam.values()].map((loc) => {
              const team = teamById.get(loc.team_id);
              // Skip pins for unknown teams (e.g. a stray admin location row).
              if (!team) return null;
              const isMe = team.id === currentTeamId;
              // Admin-hidden teams vanish for everyone else; you still see yourself.
              if (team.location_visible === false && !isMe) return null;
              return (
                <Marker
                  key={loc.team_id}
                  position={{ lat: loc.lat, lng: loc.lng }}
                  icon={team.selfie_url ? circularAvatar(team.selfie_url, 40) : poopIcon()}
                  zIndex={1000}
                  label={{
                    text: team.name + (isMe ? " (you)" : ""),
                    className: "oelp-team-label",
                    color: "#1a1a1a",
                    fontSize: "11px",
                    fontWeight: "700",
                  }}
                />
              );
            })}

            {/* "Find Me" pin */}
            {userPos && <Marker position={userPos} icon={circleIcon("#1A73E8", 30)} title="You" />}

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

            <Recenter pos={userPos} />
          </GoogleMap>
        </APIProvider>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs font-semibold">
        {(["A", "B", "C"] as Zone[]).map((z) => (
          <span key={z} className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: ZONES[z].color }} />
            {ZONES[z].label}
          </span>
        ))}
        <span className="opacity-60">Tap a pin for details.</span>
      </div>
    </div>
  );
}

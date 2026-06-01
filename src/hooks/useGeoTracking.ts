import { useEffect, useRef, useState } from "react";
import { upsertTeamLocation } from "../lib/actions";

export type GeoStatus = "idle" | "tracking" | "denied" | "unavailable" | "error";

const MIN_WRITE_INTERVAL_MS = 10_000; // don't hammer the DB on every GPS tick

/**
 * Watches the device location and keeps this team's row in team_locations fresh.
 * Writes are throttled; the row id is tracked locally so we update one row.
 */
export function useGeoTracking(
  gameId: string | null,
  teamId: string | null,
  enabled: boolean,
) {
  const [status, setStatus] = useState<GeoStatus>("idle");
  const rowId = useRef<string | null>(null);
  const lastWrite = useRef<number>(0);
  const writing = useRef(false);

  useEffect(() => {
    if (!enabled || !gameId || !teamId) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }

    setStatus("tracking");

    const onPos = async (pos: GeolocationPosition) => {
      const now = Date.now();
      if (writing.current) return;
      if (now - lastWrite.current < MIN_WRITE_INTERVAL_MS) return;
      writing.current = true;
      try {
        rowId.current = await upsertTeamLocation(
          gameId,
          teamId,
          pos.coords.latitude,
          pos.coords.longitude,
          rowId.current,
        );
        lastWrite.current = now;
        setStatus("tracking");
      } catch {
        setStatus("error");
      } finally {
        writing.current = false;
      }
    };

    const onErr = (err: GeolocationPositionError) => {
      setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
    };

    const watchId = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true,
      maximumAge: 5_000,
      timeout: 20_000,
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled, gameId, teamId]);

  return { status };
}

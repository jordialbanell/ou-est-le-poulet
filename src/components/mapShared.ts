// Shared map helpers used by both the player MapTab and the admin live map.
import { BARS, type Bar } from "../lib/data";

export const MAP_CENTER = { lat: 1.288, lng: 103.847 };

export const mapsUrl = (barName: string) =>
  `https://www.google.com/maps/search/${encodeURIComponent(`${barName} Singapore`)}`;

export const circleIcon = (color: string, size = 24) =>
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="${color}" stroke="white" stroke-width="3"/></svg>`,
  );

// 💩 emoji pin for teams without a selfie.
export const poopIcon = () =>
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36"><text x="18" y="28" font-size="26" text-anchor="middle">💩</text></svg>`,
  );

// Turn a Cloudinary selfie URL into a circular, white-bordered avatar.
export function circularAvatar(url: string, px = 40): string {
  const marker = "/upload/";
  const i = url.indexOf(marker);
  if (i === -1) return url; // not a Cloudinary URL — use as-is
  const tx = `c_fill,g_auto,w_${px},h_${px},r_max,bo_3px_solid_white,f_auto`;
  return url.slice(0, i + marker.length) + tx + "/" + url.slice(i + marker.length);
}

// All 37 bars as ready-to-render pins.
export const BAR_PINS: { bar: Bar; pos: google.maps.LatLngLiteral }[] = BARS.map(
  (bar) => ({ bar, pos: { lat: bar.lat, lng: bar.lng } }),
);

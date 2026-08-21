/** Haversine distance in meters. */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const earth = 6_371_000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.sqrt(h));
}

export function needColorScale(value: number, max: number) {
  if (max <= 0 || !Number.isFinite(value)) {
    return "#e8e2d6";
  }
  const t = Math.min(1, Math.max(0, value / max));
  // Teal → amber → deep rust (matches Haven palette, not purple defaults)
  const stops: [number, number, number][] = [
    [232, 226, 214],
    [196, 168, 110],
    [176, 98, 62],
    [120, 58, 48],
  ];
  const scaled = t * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(scaled));
  const local = scaled - index;
  const from = stops[index];
  const to = stops[index + 1];
  const rgb = from.map((channel, i) =>
    Math.round(channel + (to[i] - channel) * local),
  );
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

export const DOWNTOWN_CENTER: [number, number] = [32.7157, -117.1611];

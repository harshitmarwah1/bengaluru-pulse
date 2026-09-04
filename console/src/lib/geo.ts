// Real-world coordinates for the fixed set of corridor landmarks in the
// illustrative ORR East scenario. shared/floodContext gives normalized 0..1
// x/y positions (for a schematic layout), not lat/lng - this table maps the
// known place names onto their actual OpenStreetMap coordinates so the
// console's Leaflet map plots them on real terrain. Any name outside this
// fixed scenario set falls back to interpolating x/y over the corridor's
// bounding box.
export const KNOWN_COORDS: Record<string, [number, number]> = {
  "Silk Board": [12.9172, 77.6228],
  Bellandur: [12.9304, 77.6784],
  Marathahalli: [12.9591, 77.6974],
  "Ecospace jn": [12.9352, 77.6935],
};

// Bounding box for the ORR East corridor (Silk Board -> Marathahalli),
// used only as a fallback for names not in KNOWN_COORDS.
const BOUNDS = {
  latMin: 12.90,
  latMax: 12.97,
  lngMin: 77.615,
  lngMax: 77.705,
};

export function coordsFor(name: string, x: number, y: number): [number, number] {
  const known = KNOWN_COORDS[name];
  if (known) return known;
  const lat = BOUNDS.latMax - y * (BOUNDS.latMax - BOUNDS.latMin);
  const lng = BOUNDS.lngMin + x * (BOUNDS.lngMax - BOUNDS.lngMin);
  return [lat, lng];
}

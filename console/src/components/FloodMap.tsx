import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";
import type { FloodContext } from "../types";
import { coordsFor } from "../lib/geo";

const corridorNodeIcon = L.divIcon({
  className: "",
  html: '<span class="corridor-node-dot"></span>',
  iconSize: [13, 13],
  iconAnchor: [6.5, 6.5],
});

const waterlogPinIcon = L.divIcon({
  className: "",
  html: '<span class="waterlog-pin"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 14],
});

export function FloodMap({ floodContext }: { floodContext: FloodContext }) {
  const nodePositions = useMemo(
    () => floodContext.corridorNodes.map((n) => ({ ...n, pos: coordsFor(n.name, n.x, n.y) })),
    [floodContext.corridorNodes]
  );
  const pinPositions = useMemo(
    () => floodContext.waterlogPins.map((p) => ({ ...p, pos: coordsFor(p.name, p.x, p.y) })),
    [floodContext.waterlogPins]
  );

  const center = useMemo<[number, number]>(() => {
    const all = [...nodePositions.map((n) => n.pos), ...pinPositions.map((p) => p.pos)];
    const lat = all.reduce((s, [la]) => s + la, 0) / all.length;
    const lng = all.reduce((s, [, ln]) => s + ln, 0) / all.length;
    return [lat, lng];
  }, [nodePositions, pinPositions]);

  return (
    <div className="map-frame">
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={false}
        attributionControl={false}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <Polyline
          positions={nodePositions.map((n) => n.pos)}
          pathOptions={{ color: "#3a5bc7", weight: 3, dashArray: "6 6", opacity: 0.85 }}
        />
        {nodePositions.map((n) => (
          <Marker key={n.name} position={n.pos} icon={corridorNodeIcon}>
            <Tooltip permanent direction="top" offset={[0, -8]} className="corridor-node-label">
              {n.name}
            </Tooltip>
          </Marker>
        ))}
        {pinPositions.map((p) => (
          <Marker key={p.name} position={p.pos} icon={waterlogPinIcon}>
            <Tooltip direction="top" offset={[0, -14]} className="waterlog-pin-label">
              Waterlog history · {p.name}
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
      <div className="legend-in mono">
        <span>
          <span className="sw" style={{ background: "var(--crit)" }} />
          Waterlog history
        </span>
        <span>
          <span className="sw" style={{ background: "#fff", border: "2px solid #3a5bc7" }} />
          Corridor node
        </span>
      </div>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { MapMarker } from './types';

type RouteLine = {
  coordinates: [number, number][];
  color: string;
  selected: boolean;
};

type Props = {
  center: [number, number];
  markers: MapMarker[];
  routes: RouteLine[];
  className?: string;
};

function createIcon(html: string, size = 30) {
  return L.divIcon({ html, className: 'leaflet-div-icon', iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

const originIcon = createIcon(
  '<div class="leaflet-pin origin"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M3 11l19-9-9 19-2-8z"/></svg></div>'
);
const destinationIcon = createIcon(
  '<div class="leaflet-pin destination"><svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="#c96952"/></svg></div>'
);

type CategoryStyle = { color: string; svg: string; label: string };

const categoryStyles: Record<string, CategoryStyle> = {
  Harassment: { color: '#d94545', label: 'Harassment', svg: '<path d="M12 2L1 22h22z"/><path d="M12 8v5" stroke="white" stroke-width="2"/><circle cx="12" cy="17.5" r="1" fill="white"/>' },
  'Unsafe area': { color: '#e0651f', label: 'Unsafe area', svg: '<path d="M12 2L1 22h22z"/><path d="M8 14l2 2 4-4" stroke="white" stroke-width="2" fill="none"/>' },
  'Poor lighting': { color: '#e5a548', label: 'Poor lighting', svg: '<path d="M12 2L1 22h22z"/><circle cx="12" cy="9" r="2" fill="white"/><path d="M12 12v4" stroke="white" stroke-width="2"/>' },
  'Closed business': { color: '#8a8f5c', label: 'Closed business', svg: '<rect x="6" y="8" width="12" height="10" fill="white" rx="1"/><path d="M6 12h12" stroke="#8a8f5c" stroke-width="1.5"/>' },
  'Poor road condition': { color: '#c97832', label: 'Poor road condition', svg: '<path d="M3 17h18M5 13l2-3 2 3 2-3 2 3 2-3 2 3" stroke="white" stroke-width="1.5" fill="none"/>' },
  'Stray dogs': { color: '#b57b3a', label: 'Stray dogs', svg: '<circle cx="9" cy="12" r="4" fill="white"/><circle cx="16" cy="14" r="2.5" fill="white"/><circle cx="7" cy="8" r="1.5" fill="white"/><circle cx="11" cy="8" r="1.5" fill="white"/>' },
  'Snatch theft': { color: '#c73e3e', label: 'Snatch theft', svg: '<path d="M5 8l4-4 2 2-4 4zM7 10l8 8M15 18l3-3" stroke="white" stroke-width="1.5" fill="none"/>' },
  Other: { color: '#7a8a82', label: 'Other', svg: '<circle cx="12" cy="12" r="3" fill="white"/><path d="M12 8v-2M12 18v-2M8 12H6M18 12h-2" stroke="white" stroke-width="1.5"/>' },
};

function incidentIcon(category: string, verified: boolean): L.DivIcon {
  const style = categoryStyles[category] ?? categoryStyles.Other;
  const fill = verified ? style.color : style.color;
  const opacity = verified ? '' : ' style="opacity:0.6"';
  const checkmark = verified ? '' : '<circle cx="12" cy="12" r="11" fill="none" stroke="white" stroke-width="1" stroke-dasharray="3,2"/>';
  return createIcon(
    `<div class="leaflet-pin incident-marker"${opacity}><svg width="20" height="20" viewBox="0 0 24 24" fill="${fill}" stroke="white" stroke-width="1.5">${style.svg}${checkmark}</svg></div>`,
    28
  );
}

export default function MapView({ center, markers, routes, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true }).setView(center, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => { map.remove(); mapRef.current = null; };
  }, [center]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    routes.forEach((r) => {
      L.polyline(r.coordinates, {
        color: r.color,
        weight: r.selected ? 6 : 4,
        opacity: r.selected ? 0.9 : 0.5,
        dashArray: r.selected ? undefined : '8,8',
      }).addTo(layer);
    });

    markers.forEach((m) => {
      let icon: L.DivIcon;
      if (m.type === 'origin') icon = originIcon;
      else if (m.type === 'destination') icon = destinationIcon;
      else icon = incidentIcon(m.category ?? 'Other', m.type === 'verified');
      L.marker([m.lat, m.lng], { icon }).addTo(layer).bindPopup(m.label);
    });

    if (routes.length > 0) {
      const allCoords = routes.flatMap((r) => r.coordinates);
      if (allCoords.length >= 2) {
        const bounds = L.latLngBounds(allCoords);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [markers, routes]);

  return <div ref={containerRef} className={className} />;
}

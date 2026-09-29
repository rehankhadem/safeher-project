import { useEffect, useRef } from 'react';
import L from 'leaflet';

type Props = {
  initialCenter: [number, number];
  onPinDrag: (lat: number, lng: number) => void;
  className?: string;
};

const pinIcon = L.divIcon({
  html: '<div class="leaflet-pin draggable"><svg width="20" height="20" viewBox="0 0 24 24" fill="#c96952" stroke="white" stroke-width="1.5"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="white"/></svg></div>',
  className: 'leaflet-div-icon',
  iconSize: [36, 36],
  iconAnchor: [18, 30],
});

export default function DraggablePinMap({ initialCenter, onPinDrag, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: true }).setView(initialCenter, 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker(initialCenter, { icon: pinIcon, draggable: true }).addTo(map);
    marker.on('dragend', () => {
      const ll = marker.getLatLng();
      onPinDrag(ll.lat, ll.lng);
    });
    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      onPinDrag(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    setTimeout(() => map.invalidateSize(), 100);

    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
  }, [initialCenter, onPinDrag]);

  return <div ref={containerRef} className={className} />;
}

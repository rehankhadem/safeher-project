import { useEffect, useRef, useState } from 'react';
import { Crosshair, MapPin, Search, X } from 'lucide-react';
import { geocode } from './routing';
import type { GeocodeResult } from './types';

type Props = {
  label: string;
  placeholder: string;
  initialValue?: string;
  initialCoords?: [number, number] | null;
  onLocationChange: (coords: [number, number], displayName: string) => void;
  showLocate?: boolean;
};

export default function LocationSearch({ label, placeholder, initialValue = '', initialCoords, onLocationChange, showLocate = false }: Props) {
  const [query, setQuery] = useState(initialValue);
  const [coords, setCoords] = useState<[number, number] | undefined>(initialCoords);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = async (value: string) => {
    if (value.trim().length < 3) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await geocode(`${value}, Dhaka, Bangladesh`);
      setResults(res);
      setShowDropdown(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void search(value), 400);
  };

  const selectResult = (result: GeocodeResult) => {
    setQuery(result.display_name.split(',')[0]);
    setCoords([result.lat, result.lng]);
    setShowDropdown(false);
    onLocationChange([result.lat, result.lng], result.display_name);
  };

  const useGeolocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setCoords(c);
        setQuery('Current location');
        onLocationChange(c, 'Current location');
      },
      () => { setQuery('Location unavailable'); }
    );
  };

  return (
    <div className="search-field" style={{ position: 'relative' }} ref={containerRef}>
      <MapPin size={18} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <label>{label}</label>
        <input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          aria-label={label}
        />
      </div>
      {query && (
        <button className="clear-button" aria-label="Clear" onClick={() => { setQuery(''); setResults([]); setCoords(undefined); }}>
          <X size={15} />
        </button>
      )}
      {showLocate && (
        <button className="locate-button" aria-label="Use current location" onClick={useGeolocation}>
          <Crosshair size={17} />
        </button>
      )}
      {showDropdown && (results.length > 0 || loading) && (
        <div className="search-dropdown">
          {loading && <div className="search-result loading"><Search size={14} /> Searching...</div>}
          {results.map((result, index) => (
            <button key={index} className="search-result" onClick={() => selectResult(result)}>
              <MapPin size={14} />
              <span>{result.display_name}</span>
            </button>
          ))}
        </div>
      )}
      {coords && <span className="coords-badge">{coords[0].toFixed(4)}, {coords[1].toFixed(4)}</span>}
    </div>
  );
}

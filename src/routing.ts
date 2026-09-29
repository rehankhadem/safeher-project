import type { RouteOption, IncidentReport, ScoreFactor } from './types';

const OSRM_BASE = 'https://router.project-osrm.org';

type OsrmRoute = {
  coordinates: [number, number][];
  distance: number; // meters
  duration: number; // seconds
};

async function fetchOsrmRoutes(origin: [number, number], destination: [number, number]): Promise<OsrmRoute[]> {
  const url = `${OSRM_BASE}/route/v1/walking/${origin[1]},${origin[0]};${destination[1]},${destination[0]}?alternatives=true&overview=full&geometries=geojson&steps=false`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Routing failed (${res.status})`);
  const json = await res.json();
  if (json.code !== 'Ok' || !json.routes?.length) throw new Error('No routes found');

  return json.routes.map((r: { geometry: { coordinates: [number, number][] }; distance: number; duration: number }) => ({
    coordinates: r.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
    distance: r.distance,
    duration: r.duration,
  }));
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointToSegmentMeters(lat: number, lng: number, a: [number, number], b: [number, number]): number {
  const dLatSeg = b[0] - a[0];
  const dLngSeg = b[1] - a[1];
  const lenSq = dLatSeg ** 2 + dLngSeg ** 2;
  if (lenSq === 0) return haversineMeters(lat, lng, a[0], a[1]);
  let t = ((lat - a[0]) * dLatSeg + (lng - a[1]) * dLngSeg) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projLat = a[0] + t * dLatSeg;
  const projLng = a[1] + t * dLngSeg;
  return haversineMeters(lat, lng, projLat, projLng);
}

function incidentDistanceToRoute(lat: number, lng: number, coords: [number, number][]): number {
  let min = Infinity;
  for (let i = 0; i < coords.length - 1; i++) {
    const d = pointToSegmentMeters(lat, lng, coords[i], coords[i + 1]);
    if (d < min) min = d;
  }
  return min;
}

const categoryPenalties: Record<string, number> = {
  Harassment: -30,
  'Unsafe area': -22,
  'Stray dogs': -18,
  'Poor road condition': -16,
  'Snatch theft': -25,
  'Poor lighting': -15,
  'Closed business': -10,
  Other: -8,
};

const categoryIcons: Record<string, ScoreFactor['icon']> = {
  'Poor lighting': 'lighting',
  Harassment: 'harassment',
  'Closed business': 'business',
  'Unsafe area': 'unsafe',
  'Poor road condition': 'road',
  'Stray dogs': 'dogs',
  'Snatch theft': 'theft',
  Other: 'other',
};

const ON_ROUTE_RADIUS = 75; // meters — incident must be within this distance of the path
const BASE_SCORE = 100;

function scoreRoute(route: OsrmRoute, incidents: IncidentReport[]): { score: number; factors: ScoreFactor[] } {
  let score = BASE_SCORE;
  const factors: ScoreFactor[] = [];

  const candidates = incidents.filter((inc) => inc.lat !== null && inc.lng !== null && inc.status !== 'rejected');

  candidates.forEach((inc) => {
    const dist = incidentDistanceToRoute(inc.lat!, inc.lng!, route.coordinates);
    if (dist <= ON_ROUTE_RADIUS) {
      const penalty = categoryPenalties[inc.category] ?? -8;
      const weight = 1 - dist / ON_ROUTE_RADIUS;
      const impact = Math.round(penalty * weight);
      if (impact !== 0) {
        score += impact;
        factors.push({
          label: inc.category,
          impact,
          icon: categoryIcons[inc.category] ?? 'other',
          description: `${inc.location} — ${dist < 10 ? 'on route' : `${Math.round(dist)}m from path`}`,
        });
      }
    }
  });

  factors.sort((a, b) => a.impact - b.impact);
  score = Math.max(0, Math.min(100, score));
  return { score, factors };
}

function formatMinutes(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60));
}

function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

function buildLabel(score: number, index: number, total: number, incidentCount: number): { label: string; tone: RouteOption['tone']; details: string } {
  const incidentText = incidentCount === 0 ? 'no reported incidents on the path' : `${incidentCount} reported incident${incidentCount === 1 ? '' : 's'} on the path`;
  if (index === 0) {
    return { label: 'SafeHer recommended', tone: 'recommended', details: `Highest safety score (${score}/100) — ${incidentText}.` };
  }
  if (index === total - 1) {
    return { label: 'Fastest route', tone: 'fastest', details: `Shortest time but has ${incidentText}.` };
  }
  return { label: 'Balanced route', tone: 'balanced', details: `Middle ground between safety and speed — ${incidentText}.` };
}

export async function getRoutes(origin: [number, number], destination: [number, number], incidents: IncidentReport[]): Promise<RouteOption[]> {
  const osrmRoutes = await fetchOsrmRoutes(origin, destination);
  const scored = osrmRoutes.map((route) => ({ route, ...scoreRoute(route, incidents) }));
  scored.sort((a, b) => b.score - a.score);

  return scored.map((item, index) => {
    const { label, tone, details } = buildLabel(item.score, index, scored.length, item.factors.filter((f) => f.impact < 0).length);
    return {
      id: `route-${index}`,
      label,
      minutes: formatMinutes(item.route.duration),
      distance: formatDistance(item.route.distance),
      score: item.score,
      tone,
      details,
      coordinates: item.route.coordinates,
      factors: item.factors,
    };
  });
}

export async function geocode(query: string): Promise<{ display_name: string; lat: number; lng: number }[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=bd&limit=5`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error('Search failed');
  const json = await res.json();
  return json.map((r: { display_name: string; lat: string; lon: string }) => ({
    display_name: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  }));
}

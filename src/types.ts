export type ReportStatus = 'pending' | 'verified' | 'rejected';

export type IncidentReport = {
  id: string;
  category: string;
  description: string;
  location: string;
  status: ReportStatus;
  created_at: string;
  lat: number | null;
  lng: number | null;
};

export type RouteOption = {
  id: string;
  label: string;
  minutes: number;
  distance: string;
  score: number;
  tone: 'recommended' | 'balanced' | 'fastest';
  details: string;
  coordinates: [number, number][];
  factors: ScoreFactor[];
};

export type ScoreFactor = {
  label: string;
  impact: number;
  icon: 'lighting' | 'harassment' | 'business' | 'unsafe' | 'road' | 'dogs' | 'theft' | 'other';
  description: string;
};

export type MapMarker = {
  lat: number;
  lng: number;
  label: string;
  type: 'origin' | 'destination' | 'incident' | 'verified';
  category?: string;
};

export type LatLng = {
  lat: number;
  lng: number;
};

export type GeocodeResult = {
  display_name: string;
  lat: number;
  lng: number;
};

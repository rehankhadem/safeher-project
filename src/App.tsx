import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  Construction,
  Crosshair,
  Dog,
  FileText,
  Footprints,
  HelpCircle,
  Home,
  Info,
  Layers3,
  Lightbulb,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  MessageSquareWarning,
  Navigation,
  Phone,
  Plus,
  Radio,
  Route,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Store,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import MapView from './MapView';
import { getRoutes, geocode } from './routing';
import LocationSearch from './LocationSearch';
import DraggablePinMap from './DraggablePinMap';
import AuthScreen from './AuthScreen';
import { supabase, useAuth } from './auth';
import type { IncidentReport, RouteOption, MapMarker, ReportStatus, GeocodeResult } from './types';

type View = 'explore' | 'reports' | 'admin' | 'profile';

const DEFAULT_CENTER: [number, number] = [23.7720, 90.4080]; // Dhanmondi area

const categoryMetadata: Record<string, { icon: LucideIcon; color: string }> = {
  'Poor lighting': { icon: Lightbulb, color: '#e5a548' },
  Harassment: { icon: ShieldAlert, color: '#d94545' },
  'Unsafe area': { icon: AlertTriangle, color: '#e0651f' },
  'Closed business': { icon: Store, color: '#8a8f5c' },
  'Poor road condition': { icon: Construction, color: '#c97832' },
  'Stray dogs': { icon: Dog, color: '#b57b3a' },
  'Snatch theft': { icon: Footprints, color: '#c73e3e' },
  Other: { icon: Info, color: '#7a8a82' },
};

const categoryOptions = Object.keys(categoryMetadata);

const initialIncidents: IncidentReport[] = [
  { id: '1', category: 'Poor lighting', description: 'Streetlight near the overpass has been out for several nights, making the walkway very dark.', location: 'Satmasjid Road, Dhanmondi', status: 'verified', created_at: new Date(Date.now() - 1000 * 60 * 48).toISOString(), lat: 23.7740, lng: 90.4100 },
  { id: '2', category: 'Harassment', description: 'Someone was following pedestrians near the New Market south entrance after 8pm.', location: 'New Market, Mirzapur', status: 'pending', created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), lat: 23.7650, lng: 90.3910 },
  { id: '3', category: 'Closed business', description: 'The pharmacy on the corner is no longer open after 9pm, reducing foot traffic.', location: 'Dhanmondi 27/A', status: 'verified', created_at: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(), lat: 23.7770, lng: 90.4150 },
  { id: '4', category: 'Unsafe area', description: 'Narrow lane with no streetlights between Rayer Bazaar and the main road.', location: 'Rayer Bazaar, Dhanmondi', status: 'verified', created_at: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(), lat: 23.7720, lng: 90.4060 },
  { id: '5', category: 'Harassment', description: 'Group of men making inappropriate comments near the bus stop late at night.', location: 'Mirpur Road, near Abahani Playground', status: 'verified', created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), lat: 23.7710, lng: 90.4075 },
  { id: '6', category: 'Poor lighting', description: 'Multiple streetlights broken on this stretch for over a week.', location: 'Satmasjid Road, near Rayer Bazaar junction', status: 'verified', created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), lat: 23.7735, lng: 90.4085 },
  { id: '7', category: 'Poor road condition', description: 'Large potholes and broken pavement forcing pedestrians onto the road.', location: 'Dhanmondi 15/A, near Lake Road', status: 'verified', created_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(), lat: 23.7755, lng: 90.4120 },
  { id: '8', category: 'Closed business', description: 'The 24/7 convenience store shut down, no more late-night foot traffic.', location: 'Mirpur Road, near Dhanmondi 2', status: 'pending', created_at: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString(), lat: 23.7680, lng: 90.4020 },
  { id: '9', category: 'Harassment', description: 'Reported stalking incident near the park entrance after sunset.', location: 'Dhanmondi Lake Park, Road 32', status: 'verified', created_at: new Date(Date.now() - 1000 * 60 * 60 * 15).toISOString(), lat: 23.7765, lng: 90.4145 },
  { id: '10', category: 'Poor lighting', description: 'The entire alley behind the market is pitch dark after 7pm.', location: 'New Market back alley, Mirzapur', status: 'verified', created_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), lat: 23.7640, lng: 90.3900 },
  { id: '11', category: 'Snatch theft', description: 'Frequent reports of bag snatching on this narrow road, especially after dark.', location: 'Rayer Bazaar narrow lane', status: 'verified', created_at: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(), lat: 23.7715, lng: 90.4050 },
  { id: '12', category: 'Stray dogs', description: 'Aggressive pack of stray dogs near the park entrance after sunset.', location: 'Dhanmondi Lake Park, Road 32', status: 'verified', created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), lat: 23.7760, lng: 90.4140 },
  { id: '13', category: 'Poor road condition', description: 'Construction debris blocking the sidewalk near the intersection.', location: 'Satmasjid Road & Dhanmondi 27', status: 'verified', created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), lat: 23.7745, lng: 90.4110 },
];

function App() {
  const { user, profile, loading, signOut } = useAuth();
  const [view, setView] = useState<View>('explore');
  const [showReport, setShowReport] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [incidents, setIncidents] = useState<IncidentReport[]>(initialIncidents);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadReports = async () => {
      const { data, error } = await supabase.from('incident_reports').select('*').order('created_at', { ascending: false });
      if (!error && data) setIncidents(data as IncidentReport[]);
    };
    void loadReports();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const verifiedCount = incidents.filter((incident) => incident.status === 'verified').length;

  const handleReportSubmit = async (report: Omit<IncidentReport, 'id' | 'created_at' | 'status'>) => {
    if (!user) {
      setShowReport(false);
      setShowAuth(true);
      return;
    }
    const optimistic: IncidentReport = { ...report, id: crypto.randomUUID(), status: 'pending', created_at: new Date().toISOString() };
    setIncidents((current) => [optimistic, ...current]);
    setShowReport(false);
    const { data, error } = await supabase.from('incident_reports').insert({ category: report.category, description: report.description, location: report.location, lat: report.lat, lng: report.lng }).select().maybeSingle();
    if (!error && data) setIncidents((current) => [data as IncidentReport, ...current.filter((item) => item.id !== optimistic.id)]);
  };

  const handleStatusChange = async (id: string, status: ReportStatus) => {
    setIncidents((current) => current.map((incident) => incident.id === id ? { ...incident, status } : incident));
    await supabase.from('incident_reports').update({ status }).eq('id', id);
  };

  const handleSignOut = async () => {
    await signOut();
    setView('explore');
    setShowUserMenu(false);
  };

  const requireAuth = () => {
    if (!user) {
      setShowAuth(true);
      return false;
    }
    return true;
  };

  const handleReportClick = () => {
    if (requireAuth()) setShowReport(true);
  };

  const navigateTo = (newView: View) => {
    setView(newView);
    setShowUserMenu(false);
    setShowMenu(false);
  };

  if (loading) {
    return <div className="auth-screen"><div className="auth-loading"><div className="map-spinner" /><p>Loading SafeHer...</p></div></div>;
  }

  const isAdmin = profile?.role === 'admin';
  const isLoggedIn = !!user && !!profile;
  const initials = isLoggedIn
    ? (profile!.display_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || profile!.email[0].toUpperCase())
    : '?';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark"><ShieldCheck size={22} strokeWidth={2.5} /></div>
          <div>
            <div className="brand-name">SafeHer</div>
            <div className="brand-tagline">Move with confidence</div>
          </div>
        </div>
        <nav className={`topnav ${showMenu ? 'is-open' : ''}`}>
          <button className={view === 'explore' ? 'nav-link active' : 'nav-link'} onClick={() => navigateTo('explore')}><Navigation size={16} /> Explore</button>
          <button className={view === 'reports' ? 'nav-link active' : 'nav-link'} onClick={() => navigateTo('reports')}><Radio size={16} /> Community reports <span className="nav-count">{incidents.length}</span></button>
        </nav>
        <div className="top-actions">
          {isLoggedIn ? (
            <div className="user-dropdown-wrapper" ref={userMenuRef}>
              <button className="profile-button" onClick={() => setShowUserMenu((open) => !open)}>
                <span className="profile-avatar">{initials}</span>
                <span className="profile-name">{profile!.display_name}</span>
                <ChevronDown size={15} className={showUserMenu ? 'chevron-up' : ''} />
              </button>
              {showUserMenu && (
                <div className="user-dropdown-menu">
                  <div className="dropdown-header">
                    <span className="dropdown-name">{profile!.display_name}</span>
                    <span className="dropdown-email">{profile!.email}</span>
                  </div>
                  <button className="dropdown-item" onClick={() => navigateTo('profile')}>
                    <UserCircle size={16} /> My profile
                  </button>
                  {isAdmin && (
                    <button className="dropdown-item" onClick={() => navigateTo('admin')}>
                      <Layers3 size={16} /> Admin view
                    </button>
                  )}
                  <button className="dropdown-item" onClick={() => { navigateTo('explore'); setShowEmergency(true); setShowUserMenu(false); }}>
                    <Phone size={16} /> Emergency contacts
                  </button>
                  <button className="dropdown-item" onClick={() => navigateTo('reports')}>
                    <MessageSquareWarning size={16} /> My reports
                  </button>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                    <Settings size={16} /> Settings
                  </button>
                  <button className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                    <HelpCircle size={16} /> Help & support
                  </button>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item danger" onClick={handleSignOut}>
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="signin-cta" onClick={() => setShowAuth(true)}><LogIn size={16} /> Sign in</button>
          )}
          <button className="mobile-menu" aria-label="Open navigation" onClick={() => setShowMenu((open) => !open)}>{showMenu ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </header>

      {view === 'explore' && <ExploreView incidents={incidents} onReport={handleReportClick} onEmergency={() => setShowEmergency(true)} />}
      {view === 'reports' && <ReportsView incidents={incidents} onReport={handleReportClick} />}
      {view === 'admin' && isAdmin && <AdminView incidents={incidents} onStatusChange={handleStatusChange} verifiedCount={verifiedCount} />}
      {view === 'admin' && !isAdmin && <div className="main-content"><p className="subheading">You need admin access to view this page.</p></div>}
      {view === 'profile' && isLoggedIn && <ProfileView />}
      {view === 'profile' && !isLoggedIn && <div className="main-content"><p className="subheading">Please sign in to view your profile.</p></div>}

      <footer className="footer"><span><Shield size={14} /> Your safety is our priority</span><span>Data updated 2 min ago <span className="status-dot" /></span></footer>

      {showReport && <ReportModal onClose={() => setShowReport(false)} onSubmit={handleReportSubmit} />}
      {showEmergency && <EmergencyModal onClose={() => setShowEmergency(false)} />}
      {showAuth && <AuthScreen onClose={() => setShowAuth(false)} />}
    </div>
  );
}

function ExploreView({ incidents, onReport, onEmergency }: { incidents: IncidentReport[]; onReport: () => void; onEmergency: () => void }) {
  const [origin, setOrigin] = useState<[number, number] | null>(null);
  const [originName, setOriginName] = useState('');
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [destName, setDestName] = useState('');
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoutes = async (org: [number, number], dest: [number, number]) => {
    setLoading(true);
    setError(null);
    try {
      const scored = await getRoutes(org, dest, incidents);
      if (scored.length === 0) throw new Error('No routes found');
      setRoutes(scored);
      setSelectedRoute(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not find routes');
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFindRoutes = () => {
    if (origin && destination) {
      void fetchRoutes(origin, destination);
    }
  };

  const selected = routes[selectedRoute] ?? null;

  const mapMarkers: MapMarker[] = [
    ...(origin ? [{ lat: origin[0], lng: origin[1], label: `From: ${originName}`, type: 'origin' as const }] : []),
    ...(destination ? [{ lat: destination[0], lng: destination[1], label: `To: ${destName}`, type: 'destination' as const }] : []),
    ...incidents
      .filter((incident) => incident.lat !== null && incident.lng !== null)
      .map((incident) => ({
        lat: incident.lat!,
        lng: incident.lng!,
        label: `${incident.category} — ${incident.location}`,
        type: incident.status === 'verified' ? ('verified' as const) : ('incident' as const),
        category: incident.category,
      })),
  ];

  const routeColors = ['#0f766e', '#e5a548', '#d96f62'];
  const mapRoutes = routes.map((route, index) => ({
    coordinates: route.coordinates,
    color: routeColors[index % routeColors.length],
    selected: index === selectedRoute,
  }));

  const mapCenter: [number, number] = origin && destination
    ? [(origin[0] + destination[0]) / 2, (origin[1] + destination[1]) / 2]
    : origin ?? destination ?? DEFAULT_CENTER;

  return (
    <main className="main-content">
      <section className="welcome-row">
        <div><p className="eyebrow"><span className="eyebrow-dot" /> Dhaka, Bangladesh</p><h1>Where are you heading?</h1><p className="subheading">We fetch real walking routes and score them by safety.</p></div>
        <button className="report-button" onClick={onReport}><Plus size={17} /> Report an incident</button>
      </section>

      <section className="route-search-card">
        <LocationSearch
          label="From"
          placeholder="Search starting point in Dhaka"
          initialValue=""
          initialCoords={null}
          showLocate={true}
          onLocationChange={(coords, name) => { setOrigin(coords); setOriginName(name); }}
        />
        <div className="route-arrow"><ArrowRight size={17} /></div>
        <LocationSearch
          label="To"
          placeholder="Search destination in Dhaka"
          initialValue=""
          initialCoords={null}
          onLocationChange={(coords, name) => { setDestination(coords); setDestName(name); }}
        />
        <button className="find-route-button" onClick={handleFindRoutes} disabled={loading || !origin || !destination}><Route size={17} /> {loading ? 'Finding routes...' : 'Find safer routes'}</button>
      </section>

      <section className="content-grid">
        <div className="map-panel">
          <div className="map-toolbar">
            <div className="map-title"><div className="live-pulse" /> Live safety map <span>{routes.length > 0 ? `${routes.length} routes · OSRM + OpenStreetMap` : 'Incident map · OpenStreetMap'}</span></div>
            <div className="map-controls"><button className="map-control"><Layers3 size={16} /> Layers</button><button className="map-control icon-only"><Crosshair size={17} /></button></div>
          </div>
          {loading && routes.length === 0 ? (
            <div className="map-loading"><div className="map-spinner" /><p>Finding safe routes...</p></div>
          ) : error && routes.length === 0 ? (
            <div className="map-error"><AlertTriangle size={24} /><p>{error}</p><button className="retry-button" onClick={handleFindRoutes}>Try again</button></div>
          ) : (
            <MapView center={mapCenter} markers={mapMarkers} routes={mapRoutes} className="map-canvas" />
          )}
          <div className="map-legend">
            <div><span className="legend-dot green" /> Recommended</div>
            <div><span className="legend-dot amber" /> Balanced</div>
            <div><span className="legend-dot red" /> Fastest</div>
          </div>
        </div>

        <aside className="route-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">{routes.length > 0 ? `${routes.length} routes found` : 'No route selected'}</p><h2>Choose your comfort level</h2></div>
            <button className="filter-button"><SlidersHorizontal size={16} /> Filter</button>
          </div>

          {loading && routes.length > 0 && <div className="route-refresh"><div className="map-spinner small" /> Updating...</div>}

          {routes.length === 0 && !loading ? (
            <div className="route-empty"><Route size={24} /><strong>No routes yet</strong><p>Select a starting point and destination, then click "Find safer routes".</p></div>
          ) : (
            <div className="route-list">
              {routes.map((route, index) => (
                <RouteCard key={route.id} route={route} selected={selectedRoute === index} onSelect={() => setSelectedRoute(index)} />
              ))}
            </div>
          )}

          {selected && (
            <>
              <div className="route-insight"><Sparkles size={17} /><div><strong>Why this route?</strong><p>{selected.details}</p></div></div>
              <div className="score-breakdown">
                <div className="score-breakdown-header"><ShieldCheck size={15} /> Safety score breakdown</div>
                {selected.factors.length === 0 ? (
                  <p className="score-empty">No nearby reports affecting this route.</p>
                ) : (
                  selected.factors.map((factor, index) => <ScoreFactorRow key={index} factor={factor} />)
                )}
                <div className="score-total"><span>Final safety score</span><strong className={`score-total-value ${selected.tone}`}>{selected.score}/100</strong></div>
              </div>
              <div className="route-actions">
                <button className="primary-cta"><Navigation size={16} /> Start navigation</button>
                <button className="secondary-cta" onClick={onEmergency}><Phone size={16} /> Emergency</button>
              </div>
            </>
          )}
        </aside>
      </section>

      <section className="bottom-grid">
        <div className="info-card safety-summary">
          <div className="card-icon green-icon"><ShieldCheck size={19} /></div>
          <div>
            <p className="card-label">Route safety score</p>
            <div className="score-row"><strong>{selected?.score ?? '--'}</strong><span>/ 100</span>{selected && <span className="score-badge">{selected.score >= 80 ? 'Excellent' : selected.score >= 60 ? 'Good' : 'Caution'}</span>}</div>
            <p className="muted">Based on incident proximity, lighting, and community reports</p>
          </div>
        </div>
        <div className="info-card"><div className="card-icon blue-icon"><Users size={19} /></div><div><p className="card-label">Community nearby</p><strong className="card-stat">12 people</strong><p className="muted">are walking this route right now</p></div><div className="mini-avatars"><span>JM</span><span>SK</span><span>+9</span></div></div>
        <div className="info-card"><div className="card-icon amber-icon"><Radio size={19} /></div><div><p className="card-label">Recent activity</p><strong className="card-stat">{incidents.length} reports</strong><p className="muted">near your selected route</p></div><ArrowRight className="card-arrow" size={17} /></div>
      </section>
    </main>
  );
}

function RouteCard({ route, selected, onSelect }: { route: RouteOption; selected: boolean; onSelect: () => void }) {
  return (
    <button className={`route-card ${selected ? 'selected' : ''}`} onClick={onSelect}>
      <div className={`route-score ${route.tone}`}><strong>{route.score}</strong><span>score</span></div>
      <div className="route-copy">
        <div className="route-card-title">{route.label}{route.tone === 'recommended' && <span className="recommended-tag">Safest</span>}</div>
        <div className="route-meta"><Clock3 size={13} /> {route.minutes} min<span /> {route.distance}</div>
      </div>
      <div className={`route-radio ${selected ? 'checked' : ''}`}>{selected && <Check size={12} />}</div>
    </button>
  );
}

function ScoreFactorRow({ factor }: { factor: { label: string; impact: number; icon: string; description: string } }) {
  const iconMap: Record<string, LucideIcon> = { lighting: Lightbulb, harassment: ShieldAlert, business: Store, unsafe: AlertTriangle, road: Construction, dogs: Dog, theft: Footprints, other: Info };
  const Icon = iconMap[factor.icon] ?? Info;
  const positive = factor.impact > 0;
  return (
    <div className="score-factor">
      <div className={`score-factor-icon ${positive ? 'positive' : 'negative'}`}><Icon size={14} /></div>
      <div className="score-factor-body">
        <div className="score-factor-label">{factor.label}</div>
        <div className="score-factor-desc">{factor.description}</div>
      </div>
      <div className={`score-factor-impact ${positive ? 'positive' : 'negative'}`}>{positive ? '+' : ''}{factor.impact}</div>
    </div>
  );
}

function ReportsView({ incidents, onReport }: { incidents: IncidentReport[]; onReport: () => void }) {
  return <main className="main-content narrow-content"><section className="welcome-row"><div><p className="eyebrow">Community safety network</p><h1>Reports from the community</h1><p className="subheading">Small updates make every route safer.</p></div><button className="report-button" onClick={onReport}><Plus size={17} /> Report an incident</button></section><div className="report-banner"><div className="banner-icon"><Users size={20} /></div><div><strong>Your voice helps someone get home safely.</strong><p>Share what you notice. Reports are reviewed before they appear as verified on the map.</p></div><ArrowRight size={18} /></div><section className="reports-list">{incidents.map((incident) => <ReportRow key={incident.id} incident={incident} />)}</section></main>;
}

function ReportRow({ incident }: { incident: IncidentReport }) {
  const meta = categoryMetadata[incident.category] ?? categoryMetadata.Other;
  const Icon = meta.icon;
  return <article className="report-row"><div className="report-row-icon" style={{ background: `${meta.color}22`, color: meta.color }}><Icon size={18} /></div><div className="report-row-body"><div className="report-row-heading"><strong>{incident.category}</strong><span className={`status-pill ${incident.status}`}>{incident.status}</span></div><p>{incident.description}</p><div className="report-row-meta"><span><MapPin size={13} /> {incident.location}</span><span><Clock3 size={13} /> {formatTime(incident.created_at)}</span></div></div><button className="row-more"><ChevronDown size={17} /></button></article>;
}

function AdminView({ incidents, onStatusChange, verifiedCount }: { incidents: IncidentReport[]; onStatusChange: (id: string, status: ReportStatus) => void; verifiedCount: number }) {
  const pending = incidents.filter((incident) => incident.status === 'pending');
  return <main className="main-content narrow-content"><section className="welcome-row"><div><p className="eyebrow">Moderation workspace</p><h1>Keep the map trustworthy</h1><p className="subheading">Review community reports before they guide someone's journey.</p></div><div className="admin-badge"><ShieldCheck size={17} /> Admin view</div></section><section className="admin-stats"><div><span>Pending review</span><strong>{pending.length}</strong></div><div><span>Verified this week</span><strong>{verifiedCount}</strong></div><div><span>Response time</span><strong>2.4 hrs</strong></div></section><section className="admin-table-card"><div className="table-heading"><h2>Review queue</h2><span>{pending.length} awaiting review</span></div>{pending.length === 0 ? <div className="empty-state"><Check size={24} /><strong>All clear</strong><p>No reports are waiting for review.</p></div> : pending.map((incident) => { const meta = categoryMetadata[incident.category] ?? categoryMetadata.Other; const Icon = meta.icon; return <div className="admin-row" key={incident.id}><div className="admin-row-main"><div className="report-row-icon pending" style={{ background: `${meta.color}22`, color: meta.color }}><Icon size={17} /></div><div><strong>{incident.category}</strong><p>{incident.description}</p><span><MapPin size={12} /> {incident.location} · {formatTime(incident.created_at)}</span></div></div><div className="admin-actions"><button className="approve-button" onClick={() => onStatusChange(incident.id, 'verified')}><Check size={15} /> Verify</button><button className="reject-button" onClick={() => onStatusChange(incident.id, 'rejected')}><X size={15} /> Reject</button></div></div>; })}</section></main>;
}

function ProfileView() {
  const { profile, signOut } = useAuth();
  if (!profile) return null;
  const isAdmin = profile.role === 'admin';
  return (
    <main className="main-content narrow-content">
      <section className="welcome-row">
        <div>
          <p className="eyebrow">Your account</p>
          <h1>My profile</h1>
          <p className="subheading">Manage your SafeHer account details.</p>
        </div>
      </section>

      <section className="profile-card">
        <div className="profile-avatar-large">{profile.display_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || profile.email[0].toUpperCase()}</div>
        <div className="profile-info">
          <h2>{profile.display_name}</h2>
          <p className="profile-email">{profile.email}</p>
          <div className={`profile-role-badge ${isAdmin ? 'admin' : 'user'}`}>
            {isAdmin ? <ShieldCheck size={14} /> : <UserCircle size={14} />}
            {isAdmin ? 'Administrator' : 'Community member'}
          </div>
        </div>
      </section>

      <section className="profile-stats">
        <div className="profile-stat">
          <span>Member since</span>
          <strong>{new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</strong>
        </div>
        <div className="profile-stat">
          <span>Account type</span>
          <strong>{isAdmin ? 'Admin' : 'User'}</strong>
        </div>
      </section>

      {isAdmin && (
        <section className="profile-admin-note">
          <ShieldCheck size={18} />
          <div>
            <strong>Admin access enabled</strong>
            <p>You can review and verify community reports from the Admin view tab.</p>
          </div>
        </section>
      )}

      <button className="signout-button" onClick={() => void signOut()}>
        <LogOut size={16} /> Sign out
      </button>
    </main>
  );
}

function ReportModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (report: Omit<IncidentReport, 'id' | 'created_at' | 'status'>) => void }) {
  const [category, setCategory] = useState(categoryOptions[0]);
  const [location, setLocation] = useState('');
  const [locationCoords, setLocationCoords] = useState<[number, number]>([DEFAULT_CENTER[0] + (Math.random() - 0.5) * 0.01, DEFAULT_CENTER[1] + (Math.random() - 0.5) * 0.01]);
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);

  const handleLocationSearch = async (value: string) => {
    setLocation(value);
    if (value.trim().length < 3) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const results = await geocode(`${value}, Dhaka, Bangladesh`);
      setSearchResults(results);
      setShowResults(true);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const selectLocation = (result: GeocodeResult) => {
    setLocation(result.display_name.split(',')[0]);
    setLocationCoords([result.lat, result.lng]);
    setShowResults(false);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({ category, location: location || 'Dhanmondi, Dhaka', description: description || 'Community report submitted from the map.', lat: locationCoords[0], lng: locationCoords[1] });
    setSubmitted(true);
  };

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal-card report-modal-card">{submitted ? <div className="success-state"><div className="success-icon"><Check size={25} /></div><h2>Thank you for looking out.</h2><p>Your report is now in the review queue. Together, small updates help people choose safer paths.</p><button className="primary-cta" onClick={onClose}>Back to map</button></div> : <><div className="modal-heading"><div><p className="eyebrow">Community report</p><h2>What did you notice?</h2></div><button className="close-modal" onClick={onClose}><X size={19} /></button></div><form onSubmit={submit}><label>Report type<select value={category} onChange={(event) => setCategory(event.target.value)}>{categoryOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label>Where did this happen?<div className="location-search-wrapper"><Search size={15} /><input value={location} onChange={(event) => handleLocationSearch(event.target.value)} onFocus={() => searchResults.length > 0 && setShowResults(true)} placeholder="Search a street, landmark, or area" className="location-input" />{showResults && (searchResults.length > 0 || searching) && <div className="search-dropdown modal-dropdown">{searching && <div className="search-result loading">Searching...</div>}{searchResults.map((result, index) => <button type="button" key={index} className="search-result" onClick={() => selectLocation(result)}><MapPin size={14} /><span>{result.display_name}</span></button>)}</div>}</div></label><div className="pin-map-section"><div className="pin-map-label"><MapPin size={14} /> Drag the pin to the exact location</div><DraggablePinMap initialCenter={locationCoords} onPinDrag={(lat, lng) => { setLocationCoords([lat, lng]); setLocation(''); }} className="pin-map-canvas" /><div className="pin-coords">{locationCoords[0].toFixed(5)}, {locationCoords[1].toFixed(5)}</div></div><label>Tell us more<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add details that could help someone stay safe" rows={4} /></label><div className="form-note"><Shield size={15} /> Reports are reviewed by the SafeHer community team.</div><button className="primary-cta" type="submit"><FileText size={16} /> Submit report</button></form></>}</div></div>;
}

function EmergencyModal({ onClose }: { onClose: () => void }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal-card emergency-card"><button className="close-modal" onClick={onClose}><X size={19} /></button><div className="emergency-mark"><Phone size={24} /></div><p className="eyebrow">You are not alone</p><h2>Need immediate help?</h2><p>Call emergency services if you are in immediate danger. SafeHer can also share your current route with a trusted contact.</p><a className="emergency-call" href="tel:999"><Phone size={18} /> Call 999 — National Emergency</a><a className="share-button" href="tel:109"><Phone size={18} /> Call 109 — Women Helpline</a><button className="share-button"><Users size={17} /> Share my route with a contact</button></div></div>;
}

function formatTime(date: string) { const minutes = Math.max(1, Math.round((Date.now() - new Date(date).getTime()) / 60000)); if (minutes < 60) return `${minutes} min ago`; const hours = Math.round(minutes / 60); return `${hours} hr${hours === 1 ? '' : 's'} ago`; }

export default App;

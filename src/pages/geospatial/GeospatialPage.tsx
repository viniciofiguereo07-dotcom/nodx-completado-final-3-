import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Globe, Layers, MapPin, Route as RouteIcon, Package, Eye,
  EyeOff, ZoomIn, ZoomOut, Crosshair, Triangle, Square,
  Minus, AlertTriangle, Shield,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { PageHeader } from '../../components/common/PageHeader';
import type { Territory, Route, Visit, InventoryItem, GeometryFeature, RiskLayer } from '../../types';

interface LatLng { lat: number; lng: number; }

function useSVGProjection(center: LatLng, zoom: number, width: number, height: number) {
  const toXY = useCallback((lat: number, lng: number) => {
    const scale = 256 * Math.pow(2, zoom);
    const x = ((lng + 180) / 360) * scale;
    const sinLat = Math.sin((lat * Math.PI) / 180);
    const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
    const cx = ((center.lng + 180) / 360) * scale;
    const cy = (0.5 - Math.log((1 + Math.sin(center.lat * Math.PI / 180)) / (1 - Math.sin(center.lat * Math.PI / 180))) / (4 * Math.PI)) * scale;
    return { x: width / 2 + (x - cx), y: height / 2 + (y - cy) };
  }, [center, zoom, width, height]);
  return { toXY };
}

const STATUS_DOT: Record<string, string> = {
  scheduled: '#a78bfa',
  in_progress: '#3b82f6',
  completed: '#22c55e',
  cancelled: '#ef4444',
};

const RISK_COLORS: Record<number, string> = {
  1: '#22c55e',
  2: '#84cc16',
  3: '#f59e0b',
  4: '#f97316',
  5: '#ef4444',
};

function geomCoords(coords: number[] | number[][] | number[][][]): number[][] {
  if (coords.length === 0) return [];
  if (typeof coords[0] === 'number') return [coords as number[]];
  if (typeof (coords[0] as number[])[0] === 'number') return coords as number[][];
  return (coords as number[][][])[0];
}

type SelectedFeature = { type: string; name: string; data: Record<string, unknown> } | null;

export function GeospatialPage() {
  const { org } = useOrg();
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [geoFeatures, setGeoFeatures] = useState<GeometryFeature[]>([]);
  const [riskLayers, setRiskLayers] = useState<RiskLayer[]>([]);
  const [loading, setLoading] = useState(true);

  const [layers, setLayers] = useState({
    territories: true,
    routes: true,
    visits: true,
    inventory: false,
    geometry: true,
    risk: true,
  });

  const [zoom, setZoom] = useState(6);
  const [center, setCenter] = useState<LatLng>({ lat: 0, lng: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; center: LatLng } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 500 });
  const [selected, setSelected] = useState<SelectedFeature>(null);

  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      const e = entries[0];
      setSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const load = useCallback(async () => {
    if (!org) return;
    const [{ data: t }, { data: r }, { data: v }, { data: inv }, { data: gf }, { data: rl }] = await Promise.all([
      supabase.from('territories').select('*').eq('organization_id', org.id),
      supabase.from('routes').select('*').eq('organization_id', org.id).eq('status', 'active'),
      supabase.from('visits').select('*').eq('organization_id', org.id).not('location', 'is', null).limit(100),
      supabase.from('inventory_items').select('*').eq('organization_id', org.id).not('center_lat', 'is', null),
      supabase.from('geometry_features').select('*').eq('organization_id', org.id),
      supabase.from('risk_layers').select('*').eq('organization_id', org.id),
    ]);
    const allTerr = (t ?? []) as Territory[];
    setTerritories(allTerr);
    setRoutes((r ?? []) as Route[]);
    setVisits((v ?? []) as Visit[]);
    setInventory((inv ?? []) as InventoryItem[]);
    setGeoFeatures((gf ?? []) as GeometryFeature[]);
    setRiskLayers((rl ?? []) as RiskLayer[]);
    setLoading(false);
  }, [org]);

  useEffect(() => { load(); }, [load]);

  // Auto-center on data centroid
  useEffect(() => {
    const points: LatLng[] = [];
    territories.forEach(t => { if (t.center_lat && t.center_lng) points.push({ lat: t.center_lat, lng: t.center_lng }); });
    routes.forEach(r => r.waypoints?.forEach(w => points.push({ lat: w.lat, lng: w.lng })));
    visits.forEach(v => { if (v.location) points.push(v.location); });
    geoFeatures.forEach(f => {
      const coords = geomCoords(f.geometry.coordinates as number[] | number[][] | number[][][]);
      if (coords.length > 0) points.push({ lat: coords[0][1], lng: coords[0][0] });
    });
    if (points.length > 0) {
      setCenter({ lat: points.reduce((s, p) => s + p.lat, 0) / points.length, lng: points.reduce((s, p) => s + p.lng, 0) / points.length });
    }
  }, [territories, routes, visits, geoFeatures]);

  const { toXY } = useSVGProjection(center, zoom, size.w, size.h);

  function onMouseDown(e: React.MouseEvent) { setDragging(true); setDragStart({ x: e.clientX, y: e.clientY, center: { ...center } }); }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging || !dragStart) return;
    const scale = 256 * Math.pow(2, zoom);
    setCenter({ lat: dragStart.center.lat + ((e.clientY - dragStart.y) / scale) * 180, lng: dragStart.center.lng - ((e.clientX - dragStart.x) / scale) * 360 });
  }
  function onMouseUp() { setDragging(false); }

  function toggleLayer(key: keyof typeof layers) { setLayers(p => ({ ...p, [key]: !p[key] })); }

  function renderGeometryFeature(feat: GeometryFeature) {
    const style = feat.style ?? {};
    const color = (style.color as string) ?? '#3b82f6';
    const coords = geomCoords(feat.geometry.coordinates as number[] | number[][] | number[][][]);

    if (feat.type === 'point' && coords.length > 0) {
      const { x, y } = toXY(coords[0][1], coords[0][0]);
      return (
        <g key={feat.id} style={{ cursor: 'pointer' }} onClick={() => setSelected({ type: 'Feature', name: feat.name, data: feat.properties })}>
          <circle cx={x} cy={y} r={8} fill={color} opacity={0.85} stroke="white" strokeWidth="2" />
          {zoom > 7 && <text x={x} y={y + 20} textAnchor="middle" fill={color} fontSize="10" fontWeight="600" style={{ userSelect: 'none' }}>{feat.name}</text>}
        </g>
      );
    }

    if (feat.type === 'line' && coords.length >= 2) {
      const pts = coords.map(c => toXY(c[1], c[0]));
      const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      return (
        <g key={feat.id} style={{ cursor: 'pointer' }} onClick={() => setSelected({ type: 'Line Feature', name: feat.name, data: feat.properties })}>
          <path d={d} fill="none" stroke={color} strokeWidth={3} opacity={0.8} strokeLinecap="round" strokeLinejoin="round" />
          {zoom > 7 && pts[0] && <text x={pts[0].x + 6} y={pts[0].y - 4} fill={color} fontSize="10" fontWeight="600" style={{ userSelect: 'none' }}>{feat.name}</text>}
        </g>
      );
    }

    if (feat.type === 'polygon' && coords.length >= 3) {
      const pts = coords.map(c => toXY(c[1], c[0]));
      const pointsStr = pts.map(p => `${p.x},${p.y}`).join(' ');
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      return (
        <g key={feat.id} style={{ cursor: 'pointer' }} onClick={() => setSelected({ type: 'Polygon Feature', name: feat.name, data: feat.properties })}>
          <polygon points={pointsStr} fill={color} fillOpacity={0.2} stroke={color} strokeWidth={2} />
          {zoom > 6 && <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize="11" fontWeight="600" style={{ userSelect: 'none' }}>{feat.name}</text>}
        </g>
      );
    }
    return null;
  }

  function renderRiskLayer(risk: RiskLayer) {
    // Find the associated geometry feature
    const feat = geoFeatures.find(f => f.id === risk.geometry_feature_id);
    if (!feat) return null;
    const riskColor = RISK_COLORS[risk.severity] ?? '#f59e0b';
    const coords = geomCoords(feat.geometry.coordinates as number[] | number[][] | number[][][]);

    if (feat.type === 'polygon' && coords.length >= 3) {
      const pts = coords.map(c => toXY(c[1], c[0]));
      const pointsStr = pts.map(p => `${p.x},${p.y}`).join(' ');
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      return (
        <g key={risk.id} style={{ cursor: 'pointer' }} onClick={() => setSelected({ type: 'Risk Zone', name: risk.name, data: { category: risk.category, hazard_type: risk.hazard_type, severity: risk.severity } })}>
          <polygon points={pointsStr} fill={riskColor} fillOpacity={0.35} stroke={riskColor} strokeWidth={2.5} strokeDasharray="6 3" />
          {zoom > 6 && (
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill={riskColor} fontSize="11" fontWeight="700" style={{ userSelect: 'none' }}>
              {risk.name} (S{risk.severity})
            </text>
          )}
        </g>
      );
    }
    return null;
  }

  const hasData = territories.length > 0 || routes.length > 0 || visits.length > 0 || geoFeatures.length > 0;

  const allLayerDefs = [
    { key: 'territories', label: 'Territories', icon: MapPin,       color: '#3b82f6', count: territories.length },
    { key: 'routes',      label: 'Routes',      icon: RouteIcon,    color: '#f59e0b', count: routes.length },
    { key: 'visits',      label: 'Visits',      icon: Globe,        color: '#22c55e', count: visits.length },
    { key: 'inventory',   label: 'Inventory',   icon: Package,      color: '#8b5cf6', count: inventory.length },
    { key: 'geometry',    label: 'Features',    icon: Triangle,     color: '#0ea5e9', count: geoFeatures.length },
    { key: 'risk',        label: 'Risk Zones',  icon: AlertTriangle,color: '#ef4444', count: riskLayers.length },
  ] as const;

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      <PageHeader title="Geospatial Engine" subtitle="Territory polygons, geometry features, route overlays, and risk zones" />

      <div className="flex gap-4 flex-1 overflow-hidden">
        {/* Layers Panel */}
        <div className="w-64 flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-4 overflow-y-auto">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Map Layers</div>
            <div className="space-y-2">
              {allLayerDefs.map(({ key, label, icon: Icon, color, count }) => (
                <button key={key} onClick={() => toggleLayer(key as keyof typeof layers)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${layers[key as keyof typeof layers] ? 'border-blue-200 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-800">{label}</div>
                    <div className="text-xs text-gray-400">{count} features</div>
                  </div>
                  {layers[key as keyof typeof layers] ? <Eye className="w-4 h-4 text-blue-500" /> : <EyeOff className="w-4 h-4 text-gray-300" />}
                </button>
              ))}
            </div>
          </div>

          {/* Risk severity legend */}
          {layers.risk && riskLayers.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Risk Severity</div>
              <div className="space-y-1">
                {[1,2,3,4,5].map(s => (
                  <div key={s} className="flex items-center gap-2 text-xs text-gray-600">
                    <div className="w-8 h-3 rounded" style={{ backgroundColor: RISK_COLORS[s], opacity: 0.7 }} />
                    <span>Level {s} — {s === 1 ? 'Minimal' : s === 2 ? 'Low' : s === 3 ? 'Moderate' : s === 4 ? 'High' : 'Critical'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visit status legend */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Visit Status</div>
            <div className="space-y-1">
              {Object.entries(STATUS_DOT).map(([s, c]) => (
                <div key={s} className="flex items-center gap-2 text-xs text-gray-600">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c }} />
                  <span className="capitalize">{s.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected feature info */}
          {selected && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs font-semibold text-slate-700 mb-0.5">{selected.type}</div>
              <div className="text-sm font-bold text-slate-900 mb-1.5">{selected.name}</div>
              {Object.entries(selected.data).filter(([, v]) => v !== null && v !== undefined).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs mb-0.5">
                  <span className="text-slate-500 capitalize">{k.replace(/_/g, ' ')}</span>
                  <span className="text-slate-700 font-medium">{String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map Canvas */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden" ref={containerRef}>
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            backgroundColor: '#f8fafc',
          }} />

          <svg
            className={`absolute inset-0 w-full h-full ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            {/* Risk polygons (rendered first, below everything) */}
            {layers.risk && riskLayers.map(r => renderRiskLayer(r))}

            {/* Geometry features */}
            {layers.geometry && geoFeatures.map(f => renderGeometryFeature(f))}

            {/* Territory Centers */}
            {layers.territories && territories.map(t => {
              if (!t.center_lat || !t.center_lng) return null;
              const { x, y } = toXY(t.center_lat, t.center_lng);
              const r = zoom > 5 ? 14 : 8;
              return (
                <g key={t.id} style={{ cursor: 'pointer' }} onClick={() => setSelected({ type: 'Territory', name: t.name, data: { level: t.level, active: String(t.is_active) } })}>
                  <circle cx={x} cy={y} r={r + 4} fill={t.color} opacity={0.15} />
                  <circle cx={x} cy={y} r={r} fill={t.color} opacity={0.8} />
                  <circle cx={x} cy={y} r={r * 0.4} fill="white" />
                  {zoom > 5 && (
                    <text x={x} y={y + r + 14} textAnchor="middle" fill={t.color} fontSize="11" fontWeight="600" style={{ userSelect: 'none' }}>{t.name}</text>
                  )}
                </g>
              );
            })}

            {/* Route Lines */}
            {layers.routes && routes.map(route => {
              const wps = route.waypoints ?? [];
              if (wps.length < 2) return null;
              const pts = wps.map(w => toXY(w.lat, w.lng));
              const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
              return (
                <g key={route.id} style={{ cursor: 'pointer' }} onClick={() => setSelected({ type: 'Route', name: route.name, data: { stops: String(wps.length), km: String(route.distance_km) } })}>
                  <path d={d} fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="8 4" opacity={0.8} />
                  {wps.map((w, i) => {
                    const { x, y } = toXY(w.lat, w.lng);
                    return (
                      <circle key={i} cx={x} cy={y} r={i === 0 || i === wps.length - 1 ? 7 : 5}
                        fill={i === 0 ? '#22c55e' : i === wps.length - 1 ? '#ef4444' : '#f59e0b'}
                        stroke="white" strokeWidth="2" />
                    );
                  })}
                </g>
              );
            })}

            {/* Visit markers */}
            {layers.visits && visits.map(v => {
              if (!v.location) return null;
              const { x, y } = toXY(v.location.lat, v.location.lng);
              const color = STATUS_DOT[v.status] ?? '#6b7280';
              return (
                <g key={v.id} style={{ cursor: 'pointer' }} onClick={() => setSelected({ type: 'Visit', name: v.address ?? 'Visit', data: { status: v.status } })}>
                  <circle cx={x} cy={y} r={6} fill={color} stroke="white" strokeWidth="1.5" opacity={0.85} />
                </g>
              );
            })}

            {/* Inventory markers */}
            {layers.inventory && inventory.map(item => {
              if (!item.center_lat || !item.center_lng) return null;
              const { x, y } = toXY(item.center_lat, item.center_lng);
              const low = item.quantity_on_hand <= item.reorder_threshold;
              return (
                <g key={item.id} style={{ cursor: 'pointer' }} onClick={() => setSelected({ type: 'Inventory', name: item.name, data: { qty: String(item.quantity_on_hand), sku: item.sku ?? '-' } })}>
                  <rect x={x - 8} y={y - 8} width={16} height={16} rx={3} fill={low ? '#ef4444' : '#8b5cf6'} opacity={0.85} />
                  <text x={x} y={y + 4} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" style={{ userSelect: 'none' }}>
                    {item.quantity_on_hand > 99 ? '99+' : item.quantity_on_hand}
                  </text>
                </g>
              );
            })}
          </svg>

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
              <div className="text-gray-500 text-sm">Loading map data...</div>
            </div>
          )}

          {!loading && !hasData && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
              <Globe className="w-12 h-12 text-gray-200 mb-3" />
              <div className="text-gray-500 font-medium">No geospatial data yet</div>
              <div className="text-sm text-gray-400 mt-1">Add territories, routes, geometry features, or risk zones to visualize them here</div>
            </div>
          )}

          {/* Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <button onClick={() => setZoom(z => Math.min(z + 1, 15))} className="w-9 h-9 bg-white border border-gray-200 rounded-xl shadow-sm flex items-center justify-center hover:bg-gray-50">
              <ZoomIn className="w-4 h-4 text-gray-600" />
            </button>
            <button onClick={() => setZoom(z => Math.max(z - 1, 1))} className="w-9 h-9 bg-white border border-gray-200 rounded-xl shadow-sm flex items-center justify-center hover:bg-gray-50">
              <ZoomOut className="w-4 h-4 text-gray-600" />
            </button>
            <button onClick={() => setCenter({ lat: 0, lng: 0 })} className="w-9 h-9 bg-white border border-gray-200 rounded-xl shadow-sm flex items-center justify-center hover:bg-gray-50">
              <Crosshair className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-500 font-mono">
            zoom: {zoom} | {center.lat.toFixed(2)}, {center.lng.toFixed(2)}
          </div>

          <div className="absolute top-4 left-4 flex gap-2 flex-wrap max-w-sm">
            {allLayerDefs.filter(l => layers[l.key as keyof typeof layers] && l.count > 0).map(l => (
              <div key={l.key} className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl px-2.5 py-1 text-xs font-medium">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                {l.count} {l.label.toLowerCase()}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

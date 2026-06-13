import { useState, useEffect } from 'react';
import { Map, ChevronRight, Plus, Search, Globe, MapPin, Trees, Building2, Grid3x3 as Grid3X3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import type { GeographicUnit, GeographicLevel } from '../../types';

const LEVEL_ICONS: Record<string, React.ElementType> = {
  country:      Globe,
  region:       Map,
  province:     Trees,
  municipality: Building2,
  district:     Grid3X3,
  section:      MapPin,
  locality:     MapPin,
};

function UnitCard({ unit, levels, onSelect, selected }: {
  unit: GeographicUnit;
  levels: GeographicLevel[];
  onSelect: (u: GeographicUnit) => void;
  selected: GeographicUnit | null;
}) {
  const level = levels.find(l => l.id === unit.level_id);
  const Icon = level ? (LEVEL_ICONS[level.code] ?? MapPin) : MapPin;
  const isSelected = selected?.id === unit.id;

  return (
    <button
      onClick={() => onSelect(unit)}
      className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
        isSelected
          ? 'bg-blue-50 border-blue-200 shadow-sm'
          : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}`}>
        <Icon size={16} className={isSelected ? 'text-blue-600' : 'text-gray-500'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 truncate">{unit.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {level && <span className="text-xs text-gray-400">{level.name}</span>}
          {unit.pcode && <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1 rounded">{unit.pcode}</span>}
        </div>
      </div>
      <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
    </button>
  );
}

export function GeographyPage() {
  const { org } = useOrg();
  const orgId = org?.id;
  const [levels, setLevels] = useState<GeographicLevel[]>([]);
  const [units, setUnits] = useState<GeographicUnit[]>([]);
  const [selected, setSelected] = useState<GeographicUnit | null>(null);
  const [search, setSearch] = useState('');
  const [activeLevelId, setActiveLevelId] = useState<string | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'browser' | 'hierarchy'>('browser');

  useEffect(() => {
    loadData();
  }, [orgId]);

  async function loadData() {
    setLoading(true);
    const [levRes, unitRes] = await Promise.all([
      supabase.from('geographic_levels').select('*').order('rank'),
      supabase.from('geographic_units').select('*').order('name').limit(500),
    ]);
    setLevels(levRes.data ?? []);
    setUnits(unitRes.data ?? []);
    setLoading(false);
  }

  const filtered = units.filter(u => {
    const matchSearch = search === '' || u.name.toLowerCase().includes(search.toLowerCase()) || (u.pcode ?? '').toLowerCase().includes(search.toLowerCase());
    const matchLevel  = activeLevelId === 'all' || u.level_id === activeLevelId;
    return matchSearch && matchLevel;
  });

  const systemLevels = levels.filter(l => l.is_system);
  const customLevels = levels.filter(l => !l.is_system);

  function buildTree(parentId: string | null): GeographicUnit[] {
    return units.filter(u => u.parent_id === parentId).map(u => ({ ...u, children: buildTree(u.id) }));
  }

  function TreeNode({ unit, depth = 0 }: { unit: GeographicUnit & { children?: GeographicUnit[] }; depth?: number }) {
    const [expanded, setExpanded] = useState(depth < 2);
    const level = levels.find(l => l.id === unit.level_id);
    const Icon = level ? (LEVEL_ICONS[level.code] ?? MapPin) : MapPin;
    const hasChildren = (unit.children?.length ?? 0) > 0;

    return (
      <div>
        <div
          className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 cursor-pointer group"
          style={{ paddingLeft: `${8 + depth * 20}px` }}
          onClick={() => { setSelected(unit); if (hasChildren) setExpanded(e => !e); }}
        >
          {hasChildren
            ? <ChevronRight size={14} className={`text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            : <span className="w-[14px]" />
          }
          <div className="p-1 bg-gray-100 rounded group-hover:bg-gray-200">
            <Icon size={12} className="text-gray-500" />
          </div>
          <span className="text-sm text-gray-700">{unit.name}</span>
          {unit.pcode && <span className="text-xs text-gray-400 font-mono ml-auto">{unit.pcode}</span>}
        </div>
        {expanded && hasChildren && unit.children?.map(child => (
          <TreeNode key={child.id} unit={child as GeographicUnit & { children?: GeographicUnit[] }} depth={depth + 1} />
        ))}
      </div>
    );
  }

  const roots = buildTree(null);
  const selectedLevel = selected ? levels.find(l => l.id === selected.level_id) : null;

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Geographic Hierarchy</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage geographic units, levels, and boundaries</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus size={15} /> Add Unit
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Units',  value: units.length,                   color: 'text-blue-600' },
          { label: 'Levels',       value: levels.length,                  color: 'text-emerald-600' },
          { label: 'Countries',    value: units.filter(u => levels.find(l => l.id === u.level_id)?.code === 'country').length, color: 'text-amber-600' },
          { label: 'Provinces',    value: units.filter(u => levels.find(l => l.id === u.level_id)?.code === 'province').length, color: 'text-purple-600' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{kpi.label}</p>
            <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: filters + list */}
        <div className="col-span-4 space-y-4">
          {/* Tab toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {(['browser', 'hierarchy'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-1.5 text-sm rounded-lg font-medium transition-colors ${tab === t ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
              >
                {t === 'browser' ? 'Browser' : 'Tree View'}
              </button>
            ))}
          </div>

          {tab === 'browser' && (
            <>
              {/* Search */}
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search units..."
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
                />
              </div>

              {/* Level filter */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setActiveLevelId('all')}
                  className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors ${activeLevelId === 'all' ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  All
                </button>
                {systemLevels.map(l => (
                  <button key={l.id} onClick={() => setActiveLevelId(l.id)}
                    className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors ${activeLevelId === l.id ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {l.name}
                  </button>
                ))}
              </div>

              {/* Unit list */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-10 text-gray-400 text-sm">Loading units...</div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm">No units found</div>
                ) : filtered.map(unit => (
                  <UnitCard key={unit.id} unit={unit} levels={levels} onSelect={setSelected} selected={selected} />
                ))}
              </div>
            </>
          )}

          {tab === 'hierarchy' && (
            <div className="bg-white border border-gray-200 rounded-xl p-3 max-h-[580px] overflow-y-auto">
              {roots.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No hierarchy data</div>
              ) : roots.map(r => (
                <TreeNode key={r.id} unit={r as GeographicUnit & { children?: GeographicUnit[] }} />
              ))}
            </div>
          )}
        </div>

        {/* Right: detail panel */}
        <div className="col-span-8">
          {selected ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-800">{selected.name}</h2>
                  {selectedLevel && <p className="text-xs text-gray-400 mt-0.5">{selectedLevel.name} — Rank {selectedLevel.rank}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {selected.is_active
                    ? <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Active</span>
                    : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Inactive</span>
                  }
                </div>
              </div>

              <div className="p-6 grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Identifiers</h3>
                  {[
                    { label: 'P-Code',    value: selected.pcode },
                    { label: 'ISO Code',  value: selected.iso_code },
                    { label: 'Code',      value: selected.code },
                    { label: 'Unit ID',   value: selected.id.slice(0, 8) + '...' },
                  ].map(row => row.value ? (
                    <div key={row.label}>
                      <p className="text-xs text-gray-400">{row.label}</p>
                      <p className="text-sm font-medium text-gray-800 font-mono mt-0.5">{row.value}</p>
                    </div>
                  ) : null)}
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Statistics</h3>
                  {[
                    { label: 'Population',   value: selected.population?.toLocaleString() },
                    { label: 'Area (km²)',   value: selected.area_km2?.toFixed(2) },
                    { label: 'Centroid Lat', value: selected.centroid?.lat.toFixed(6) },
                    { label: 'Centroid Lng', value: selected.centroid?.lng.toFixed(6) },
                  ].map(row => row.value ? (
                    <div key={row.label}>
                      <p className="text-xs text-gray-400">{row.label}</p>
                      <p className="text-sm font-medium text-gray-800 mt-0.5">{row.value}</p>
                    </div>
                  ) : null)}
                </div>
              </div>

              {Object.keys(selected.metadata ?? {}).length > 0 && (
                <div className="px-6 pb-6">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Metadata</h3>
                  <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-600 overflow-auto">
                    {JSON.stringify(selected.metadata, null, 2)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 bg-gray-100 rounded-2xl mb-4">
                <Map size={32} className="text-gray-400" />
              </div>
              <p className="font-medium text-gray-600">Select a geographic unit</p>
              <p className="text-sm text-gray-400 mt-1">Details will appear here</p>
            </div>
          )}

          {/* Level reference panel */}
          <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Level Reference</h3>
            <div className="flex flex-wrap gap-2">
              {levels.sort((a, b) => a.rank - b.rank).map(l => {
                const count = units.filter(u => u.level_id === l.id).length;
                const Icon = LEVEL_ICONS[l.code] ?? MapPin;
                return (
                  <div key={l.id} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                    <Icon size={12} className="text-gray-500" />
                    <span className="text-xs text-gray-600 font-medium">{l.name}</span>
                    {count > 0 && <span className="text-xs text-gray-400">({count})</span>}
                    {l.is_system && <span className="text-xs bg-blue-50 text-blue-500 px-1 rounded">SYS</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

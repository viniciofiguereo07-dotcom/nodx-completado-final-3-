import { useState, useEffect } from 'react';
import { BookOpen, Plus, ChevronRight, Tag, RefreshCw, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { TaxonomyGroup, TaxonomyItem, HumanitarianSector } from '../../types';

const SECTOR_COLORS: Record<HumanitarianSector, { bg: string; text: string; border: string }> = {
  'WASH':          { bg: 'bg-cyan-50',     text: 'text-cyan-700',    border: 'border-cyan-200' },
  'Food Security': { bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-200' },
  'Nutrition':     { bg: 'bg-orange-50',   text: 'text-orange-700',  border: 'border-orange-200' },
  'Education':     { bg: 'bg-sky-50',      text: 'text-sky-700',     border: 'border-sky-200' },
  'Protection':    { bg: 'bg-red-50',      text: 'text-red-700',     border: 'border-red-200' },
  'Shelter':       { bg: 'bg-stone-50',    text: 'text-stone-700',   border: 'border-stone-200' },
  'Livelihoods':   { bg: 'bg-lime-50',     text: 'text-lime-700',    border: 'border-lime-200' },
  'Agriculture':   { bg: 'bg-green-50',    text: 'text-green-700',   border: 'border-green-200' },
  'Health':        { bg: 'bg-pink-50',     text: 'text-pink-700',    border: 'border-pink-200' },
  'M&E':           { bg: 'bg-violet-50',   text: 'text-violet-700',  border: 'border-violet-200' },
};

const SECTORS: HumanitarianSector[] = ['WASH', 'Food Security', 'Nutrition', 'Education', 'Protection', 'Shelter', 'Livelihoods', 'Agriculture', 'Health', 'M&E'];

function ItemNode({ item, depth = 0 }: { item: TaxonomyItem & { children?: TaxonomyItem[] }; depth?: number }) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = (item.children?.length ?? 0) > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 cursor-pointer group"
        style={{ paddingLeft: `${8 + depth * 20}px` }}
        onClick={() => hasChildren && setExpanded(e => !e)}
      >
        {hasChildren
          ? <ChevronRight size={13} className={`text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          : <span className="w-[13px]" />
        }
        <Tag size={12} className="text-gray-400 flex-shrink-0" />
        <span className="text-sm text-gray-700">{item.label}</span>
        <span className="text-xs font-mono text-gray-400 ml-auto">{item.code}</span>
        {item.is_system && <span className="text-xs bg-blue-50 text-blue-500 px-1 rounded ml-1">SYS</span>}
      </div>
      {expanded && hasChildren && item.children?.map(child => (
        <ItemNode key={child.id} item={child as TaxonomyItem & { children?: TaxonomyItem[] }} depth={depth + 1} />
      ))}
    </div>
  );
}

export function TaxonomyPage() {
  const [groups, setGroups]         = useState<TaxonomyGroup[]>([]);
  const [items, setItems]           = useState<TaxonomyItem[]>([]);
  const [activeSector, setActiveSector] = useState<HumanitarianSector | 'all'>('all');
  const [activeGroup, setActiveGroup] = useState<TaxonomyGroup | null>(null);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [gRes, iRes] = await Promise.all([
      supabase.from('taxonomy_groups').select('*').order('sector').order('name'),
      supabase.from('taxonomy_items').select('*').order('sort_order').order('label').limit(1000),
    ]);
    setGroups(gRes.data ?? []);
    setItems(iRes.data ?? []);
    setLoading(false);
  }

  const filteredGroups = groups.filter(g => {
    const matchSector = activeSector === 'all' || g.sector === activeSector;
    const matchSearch = search === '' || g.name.toLowerCase().includes(search.toLowerCase());
    return matchSector && matchSearch;
  });

  function buildTree(groupId: string, parentId: string | null): (TaxonomyItem & { children?: TaxonomyItem[] })[] {
    return items
      .filter(i => i.group_id === groupId && i.parent_id === parentId)
      .map(i => ({ ...i, children: buildTree(groupId, i.id) }));
  }

  const groupedBySector = SECTORS.reduce<Record<string, TaxonomyGroup[]>>((acc, s) => {
    acc[s] = groups.filter(g => g.sector === s);
    return acc;
  }, {} as Record<string, TaxonomyGroup[]>);

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Humanitarian Taxonomy</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configurable classification frameworks for humanitarian response sectors</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw size={16} />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus size={14} /> Add Group
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Taxonomy Groups', value: groups.length,           color: 'text-blue-600' },
          { label: 'Total Items',     value: items.length,            color: 'text-emerald-600' },
          { label: 'Active Sectors',  value: new Set(groups.map(g => g.sector)).size, color: 'text-amber-600' },
          { label: 'System Groups',   value: groups.filter(g => g.is_system).length, color: 'text-purple-600' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{kpi.label}</p>
            <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: filter + group list */}
        <div className="col-span-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search groups..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
            />
          </div>

          {/* Sector pills */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveSector('all')}
              className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors ${activeSector === 'all' ? 'bg-gray-800 border-gray-800 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              All
            </button>
            {SECTORS.map(s => {
              const cfg = SECTOR_COLORS[s];
              const active = activeSector === s;
              return (
                <button key={s} onClick={() => setActiveSector(s)}
                  className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors ${active ? `${cfg.bg} ${cfg.text} ${cfg.border}` : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  {s}
                </button>
              );
            })}
          </div>

          {/* Group list */}
          <div className="space-y-1 max-h-[520px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No groups found</div>
            ) : filteredGroups.map(group => {
              const cfg = SECTOR_COLORS[group.sector as HumanitarianSector] ?? { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' };
              const count = items.filter(i => i.group_id === group.id).length;
              const isActive = activeGroup?.id === group.id;
              return (
                <button key={group.id} onClick={() => setActiveGroup(group)}
                  className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${isActive ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                >
                  <div className={`px-2 py-0.5 rounded text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                    {group.sector}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{group.name}</p>
                    <p className="text-xs text-gray-400">{count} items</p>
                  </div>
                  {group.is_system && <span className="text-xs text-blue-400 bg-blue-50 px-1 rounded">SYS</span>}
                  <ChevronRight size={13} className="text-gray-300" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: item tree */}
        <div className="col-span-8">
          {activeGroup ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-800">{activeGroup.name}</h2>
                  {activeGroup.description && <p className="text-xs text-gray-400 mt-0.5">{activeGroup.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {(() => {
                    const cfg = SECTOR_COLORS[activeGroup.sector as HumanitarianSector];
                    return <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${cfg.bg} ${cfg.text} ${cfg.border}`}>{activeGroup.sector}</span>;
                  })()}
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                    <Plus size={12} /> Add Item
                  </button>
                </div>
              </div>

              <div className="p-4">
                {buildTree(activeGroup.id, null).length === 0 ? (
                  <div className="text-center py-12">
                    <Tag size={28} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No items in this group</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {buildTree(activeGroup.id, null).map(item => (
                      <ItemNode key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 bg-gray-100 rounded-2xl mb-4">
                <BookOpen size={32} className="text-gray-400" />
              </div>
              <p className="font-medium text-gray-600">Select a taxonomy group</p>
              <p className="text-sm text-gray-400 mt-1">Items and hierarchy will appear here</p>
            </div>
          )}

          {/* Sector overview grid */}
          <div className="mt-4 grid grid-cols-5 gap-2">
            {SECTORS.map(s => {
              const cfg = SECTOR_COLORS[s];
              const groupCount = groupedBySector[s]?.length ?? 0;
              const itemCount  = items.filter(i => groups.some(g => g.sector === s && g.id === i.group_id)).length;
              return (
                <button key={s} onClick={() => setActiveSector(s)}
                  className={`p-3 rounded-xl border text-left transition-all hover:shadow-sm ${cfg.bg} ${cfg.border}`}
                >
                  <p className={`text-xs font-semibold ${cfg.text} truncate`}>{s}</p>
                  <p className="text-lg font-bold text-gray-700 mt-0.5">{groupCount}</p>
                  <p className="text-xs text-gray-400">{itemCount} items</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

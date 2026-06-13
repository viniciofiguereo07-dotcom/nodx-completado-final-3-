import React, { useState, useEffect } from 'react';
import {
  BarChart2,
  Plus,
  Search,
  RefreshCw,
  ChevronRight,
  Target,
  Layers,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Filter,
  Download,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import {
  IndicatorCatalogItem,
  IndicatorThreshold,
  IndicatorValue,
  IndicatorDataType,
} from '../../types';

type TabType = 'catalog' | 'values' | 'thresholds';
type SectorType =
  | 'WASH'
  | 'Food Security'
  | 'Nutrition'
  | 'Education'
  | 'Protection'
  | 'Shelter'
  | 'Livelihoods'
  | 'Agriculture'
  | 'Health'
  | 'M&E';

const sectors: SectorType[] = [
  'WASH',
  'Food Security',
  'Nutrition',
  'Education',
  'Protection',
  'Shelter',
  'Livelihoods',
  'Agriculture',
  'Health',
  'M&E',
];

const sectorColors: Record<SectorType, string> = {
  WASH: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  'Food Security': 'bg-amber-100 text-amber-700 border-amber-200',
  Nutrition: 'bg-orange-100 text-orange-700 border-orange-200',
  Education: 'bg-blue-100 text-blue-700 border-blue-200',
  Protection: 'bg-red-100 text-red-700 border-red-200',
  Shelter: 'bg-stone-100 text-stone-700 border-stone-200',
  Livelihoods: 'bg-green-100 text-green-700 border-green-200',
  Agriculture: 'bg-lime-100 text-lime-700 border-lime-200',
  Health: 'bg-pink-100 text-pink-700 border-pink-200',
  'M&E': 'bg-violet-100 text-violet-700 border-violet-200',
};

const dataTypeColors: Record<IndicatorDataType, string> = {
  numeric: 'bg-blue-100 text-blue-700 border-blue-200',
  percentage: 'bg-green-100 text-green-700 border-green-200',
  index: 'bg-purple-100 text-purple-700 border-purple-200',
  score: 'bg-orange-100 text-orange-700 border-orange-200',
  boolean: 'bg-gray-100 text-gray-700 border-gray-200',
  text: 'bg-slate-100 text-slate-700 border-slate-200',
};

const severityColors: Record<string, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  gray: 'bg-gray-500',
  critical: 'bg-red-600',
  high: 'bg-orange-600',
  medium: 'bg-amber-500',
  low: 'bg-green-500',
  ok: 'bg-emerald-500',
};

interface IndicatorDetail {
  description?: string;
  formula?: string;
  aggregation_method?: string;
  subindicators?: IndicatorCatalogItem[];
}

interface ThresholdGroup {
  indicator_id: string;
  indicator_name: string;
  thresholds: IndicatorThreshold[];
}

export const IndicatorsPage: React.FC = () => {
  const { org } = useOrg();
  const orgId = org?.id;
  const [activeTab, setActiveTab] = useState<TabType>('catalog');
  const [indicators, setIndicators] = useState<IndicatorCatalogItem[]>([]);
  const [indicatorValues, setIndicatorValues] = useState<IndicatorValue[]>([]);
  const [thresholdGroups, setThresholdGroups] = useState<ThresholdGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectors, setSelectedSectors] = useState<SectorType[]>([]);
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorCatalogItem | null>(null);
  const [indicatorDetail, setIndicatorDetail] = useState<IndicatorDetail | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);

  const [kpis, setKpis] = useState({
    totalIndicators: 0,
    systemIndicators: 0,
    compositeIndicators: 0,
    withValues: 0,
  });

  useEffect(() => {
    if (orgId) {
      fetchData();
    }
  }, [orgId, activeTab]);

  const fetchData = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      if (activeTab === 'catalog') {
        await fetchIndicators();
      } else if (activeTab === 'values') {
        await fetchIndicatorValues();
      } else if (activeTab === 'thresholds') {
        await fetchThresholds();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchIndicators = async () => {
    const { data, error } = await supabase
      .from('indicator_catalog')
      .select('*')
      .eq('org_id', orgId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching indicators:', error);
      return;
    }

    const indicatorsData = data || [];
    setIndicators(indicatorsData);

    // Calculate KPIs
    const totalIndicators = indicatorsData.length;
    const systemIndicators = indicatorsData.filter((i) => i.is_system).length;
    const compositeIndicators = indicatorsData.filter((i) => i.is_composite).length;

    // Count indicators with values
    const indicatorsWithValues = await supabase
      .from('indicator_values')
      .select('indicator_id')
      .eq('org_id', orgId)
      .in(
        'indicator_id',
        indicatorsData.map((i) => i.id)
      );

    const uniqueIndicatorsWithValues = new Set(indicatorsWithValues.data?.map((v) => v.indicator_id) || []).size;

    setKpis({
      totalIndicators,
      systemIndicators,
      compositeIndicators,
      withValues: uniqueIndicatorsWithValues,
    });
  };

  const fetchIndicatorValues = async () => {
    const { data, error } = await supabase
      .from('indicator_values')
      .select(`
        *,
        indicator:indicator_catalog(name, unit)
      `)
      .eq('org_id', orgId)
      .order('period', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching indicator values:', error);
      return;
    }
    setIndicatorValues(data || []);
  };

  const fetchThresholds = async () => {
    const { data: thresholds, error } = await supabase
      .from('indicator_thresholds')
      .select(`
        *,
        indicator:indicator_catalog(id, name)
      `)
      .eq('org_id', orgId)
      .order('indicator_id', { ascending: true });

    if (error) {
      console.error('Error fetching thresholds:', error);
      return;
    }

    // Group by indicator
    const grouped = new Map<string, ThresholdGroup>();
    (thresholds || []).forEach((threshold) => {
      const indicatorId = threshold.indicator_id;
      const indicatorName = threshold.indicator?.name || 'Unknown';

      if (!grouped.has(indicatorId)) {
        grouped.set(indicatorId, {
          indicator_id: indicatorId,
          indicator_name: indicatorName,
          thresholds: [],
        });
      }

      grouped.get(indicatorId)!.thresholds.push(threshold);
    });

    setThresholdGroups(Array.from(grouped.values()));
  };

  const handleIndicatorSelect = async (indicator: IndicatorCatalogItem) => {
    setSelectedIndicator(indicator);
    setShowDetailPanel(true);

    // Fetch detailed indicator info
    const { data: detail, error } = await supabase
      .from('indicator_catalog')
      .select('description, formula, aggregation_method')
      .eq('id', indicator.id)
      .single();

    if (!error && detail) {
      // Fetch subindicators if composite
      let subindicators: IndicatorCatalogItem[] = [];
      if (indicator.is_composite) {
        const { data: subs } = await supabase
          .from('indicator_catalog')
          .select('*')
          .eq('parent_id', indicator.id);
        subindicators = subs || [];
      }

      setIndicatorDetail({
        description: detail.description,
        formula: detail.formula,
        aggregation_method: detail.aggregation_method,
        subindicators,
      });
    }
  };

  const filteredIndicators = indicators.filter((indicator) => {
    const matchesSearch =
      indicator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      indicator.code?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSector = selectedSectors.length === 0 || selectedSectors.includes(indicator.sector as SectorType);
    return matchesSearch && matchesSector;
  });

  const getQualityScoreDot = (score?: number) => {
    if (!score) return 'bg-gray-300';
    if (score >= 0.8) return 'bg-emerald-500';
    if (score >= 0.6) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getSeverityColor = (severity?: string) => {
    if (!severity) return severityColors.gray;
    const key = severity.toLowerCase() as keyof typeof severityColors;
    return severityColors[key] || 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart2 className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Universal Indicator Catalog</h1>
            </div>
            <div className="flex gap-2">
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                <Download className="w-5 h-5" />
                Export
              </button>
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Plus className="w-5 h-5" />
                New Indicator
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Indicators</p>
                <p className="text-2xl font-bold text-gray-900">{kpis.totalIndicators}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">System Indicators</p>
                <p className="text-2xl font-bold text-gray-900">{kpis.systemIndicators}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-violet-100 rounded-lg">
                <Layers className="w-6 h-6 text-violet-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Composite Indicators</p>
                <p className="text-2xl font-bold text-gray-900">{kpis.compositeIndicators}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <BarChart2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">With Values</p>
                <p className="text-2xl font-bold text-gray-900">{kpis.withValues}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-6 mb-6 border-b border-gray-200">
          {(['catalog', 'values', 'thresholds'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSelectedIndicator(null);
                setShowDetailPanel(false);
              }}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Catalog Tab */}
        {activeTab === 'catalog' && (
          <div className="flex gap-6">
            {/* Left Panel: Filters and List */}
            <div className="flex-1">
              {/* Search */}
              <div className="mb-6">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search indicators..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={fetchData}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Sector Filters */}
              <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Sectors</h3>
                <div className="flex flex-wrap gap-2">
                  {sectors.map((sector) => (
                    <button
                      key={sector}
                      onClick={() =>
                        setSelectedSectors((prev) =>
                          prev.includes(sector)
                            ? prev.filter((s) => s !== sector)
                            : [...prev, sector]
                        )
                      }
                      className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                        selectedSectors.includes(sector)
                          ? sectorColors[sector]
                          : 'bg-gray-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      {sector}
                    </button>
                  ))}
                </div>
              </div>

              {/* Indicators List */}
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                </div>
              ) : filteredIndicators.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No indicators found</h3>
                  <p className="text-gray-600">Try adjusting your search or filters</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredIndicators.map((indicator) => (
                    <div
                      key={indicator.id}
                      onClick={() => handleIndicatorSelect(indicator)}
                      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-mono font-semibold rounded">
                              {indicator.code}
                            </span>
                            {indicator.is_system && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                                System
                              </span>
                            )}
                            {indicator.is_composite && (
                              <span className="px-2 py-1 bg-violet-100 text-violet-700 text-xs font-medium rounded">
                                Composite
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-gray-900">{indicator.name}</h3>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {indicator.unit && (
                          <span className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                            {indicator.unit}
                          </span>
                        )}
                        {indicator.data_type && (
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium border ${dataTypeColors[indicator.data_type]}`}
                          >
                            {indicator.data_type}
                          </span>
                        )}
                        {indicator.sector && (
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium border ${sectorColors[indicator.sector as SectorType]}`}
                          >
                            {indicator.sector}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Panel: Detail View */}
            {showDetailPanel && selectedIndicator && (
              <div className="w-96 bg-white rounded-lg border border-gray-200 p-6 sticky top-8 max-h-[calc(100vh-200px)] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-900">Details</h2>
                  <button
                    onClick={() => setShowDetailPanel(false)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Code</h3>
                    <p className="font-mono text-gray-900">{selectedIndicator.code}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Name</h3>
                    <p className="text-gray-900">{selectedIndicator.name}</p>
                  </div>

                  {indicatorDetail?.description && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Description</h3>
                      <p className="text-sm text-gray-700">{indicatorDetail.description}</p>
                    </div>
                  )}

                  {indicatorDetail?.formula && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Formula</h3>
                      <p className="text-sm font-mono text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
                        {indicatorDetail.formula}
                      </p>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Properties</h3>
                    <div className="space-y-2 text-sm">
                      {selectedIndicator.sector && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sector:</span>
                          <span className="text-gray-900">{selectedIndicator.sector}</span>
                        </div>
                      )}
                      {selectedIndicator.data_type && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Data Type:</span>
                          <span className="text-gray-900">{selectedIndicator.data_type}</span>
                        </div>
                      )}
                      {indicatorDetail?.aggregation_method && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Aggregation:</span>
                          <span className="text-gray-900">{indicatorDetail.aggregation_method}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {indicatorDetail?.subindicators && indicatorDetail.subindicators.length > 0 && (
                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Subindicators</h3>
                      <div className="space-y-2">
                        {indicatorDetail.subindicators.map((sub) => (
                          <div key={sub.id} className="text-sm p-2 bg-gray-50 rounded border border-gray-200">
                            <p className="font-medium text-gray-900">{sub.name}</p>
                            <p className="text-xs text-gray-600">{sub.code}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Values Tab */}
        {activeTab === 'values' && (
          <div>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : indicatorValues.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <BarChart2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No indicator values yet</h3>
                <p className="text-gray-600">Start entering data for your indicators</p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Indicator</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Geographic Unit</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Period</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Value</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Source</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Quality</th>
                    </tr>
                  </thead>
                  <tbody>
                    {indicatorValues.map((value) => (
                      <tr key={value.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 text-sm text-gray-900 font-medium">
                          {value.indicator?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">{value.geo_unit_id || 'N/A'}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {value.period_start ?? value.created_at
                            ? new Date((value.period_start ?? value.created_at) as string).toLocaleDateString()
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-900 font-medium">
                          {value.value}
                          {value.indicator?.unit && ` ${value.indicator.unit}`}
                        </td>
                        <td className="px-6 py-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded border border-blue-200">
                            {value.source || 'Manual'}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full ${getQualityScoreDot(value.quality_score ?? undefined)}`}
                            />
                            <span className="text-xs text-gray-600">
                              {value.quality_score ? `${(value.quality_score * 100).toFixed(0)}%` : 'N/A'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Thresholds Tab */}
        {activeTab === 'thresholds' && (
          <div>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : thresholdGroups.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No thresholds configured</h3>
                <p className="text-gray-600">Set up severity thresholds for your indicators</p>
              </div>
            ) : (
              <div className="space-y-6">
                {thresholdGroups.map((group) => (
                  <div
                    key={group.indicator_id}
                    className="bg-white rounded-lg border border-gray-200 p-6"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{group.indicator_name}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                              Severity
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                              Min Value
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                              Max Value
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                              Label
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.thresholds.map((threshold) => (
                            <tr
                              key={threshold.id}
                              className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-4 h-4 rounded ${getSeverityColor(threshold.severity ?? undefined)}`}
                                  />
                                  <span className="text-sm font-medium text-gray-900">
                                    {threshold.severity || 'Unknown'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {threshold.min_value !== undefined ? threshold.min_value : '—'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {threshold.max_value !== undefined ? threshold.max_value : '—'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">{threshold.label || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default IndicatorsPage;

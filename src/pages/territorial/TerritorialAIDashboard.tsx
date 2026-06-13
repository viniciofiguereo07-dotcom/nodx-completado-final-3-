import { useState, useEffect, useCallback } from 'react';
import {
  Brain, TrendingUp, Shield, Globe, MapPin, Route, Target,
  RefreshCw, Eye, AlertTriangle, CheckCircle, Zap, Clock,
  BarChart2, PieChart as PieChartIcon, Activity, Layers,
  Users, ChevronDown, ChevronRight, Calendar, DollarSign,
  Lightbulb, AlertCircle, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import {
  territorialAIEngine,
  type AIPredictionEngineOutput,
  type ExpansionRecommendation,
  type CommercialOpportunity,
  type HumanitarianOpportunity,
  type CoverageOptimization,
  type RouteOptimizationSuggestion,
  type PriorityIntervention,
  type StrategicRecommendation,
  type PredictionHorizon,
} from '../../services/TerritorialAIEngine';
import {
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';

const HORIZON_OPTIONS: { value: PredictionHorizon; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '180d', label: '180 Days' },
];

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const URGENCY_COLORS = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  low: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};

const PRIORITY_COLORS = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  low: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};

// Expansion Card
function ExpansionCard({ recommendation }: { recommendation: ExpansionRecommendation }) {
  const [expanded, setExpanded] = useState(false);

  const typeLabels = {
    high_potential: 'High Potential',
    adjacent: 'Adjacent Opportunity',
    greenfield: 'Greenfield',
    underserved: 'Underserved Zone',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-100">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-left">
            <div className="font-medium text-gray-800">{recommendation.zone}</div>
            <div className="text-xs text-gray-500">{typeLabels[recommendation.type]}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">{(recommendation.confidence * 100).toFixed(0)}% conf.</span>
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </button>
      {expanded && (
        <div className="p-4 pt-0 space-y-3 border-t border-gray-100">
          <p className="text-sm text-gray-600">{recommendation.rationale}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-500">Estimated Value</div>
              <div className="text-sm font-semibold text-gray-800">{recommendation.estimated_value.toLocaleString()}</div>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-500">Timeline</div>
              <div className="text-sm font-semibold text-gray-800">{recommendation.timeline}</div>
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-600 mb-1">Prerequisites:</div>
            <ul className="space-y-1">
              {recommendation.prerequisites.map((p, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-blue-500" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs font-medium text-amber-600 mb-1">Risk Factors:</div>
            <ul className="space-y-1">
              {recommendation.risk_factors.map((r, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                  <AlertCircle className="w-3 h-3 text-amber-500" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// Humanitarian Card
function HumanitarianCard({ opportunity }: { opportunity: HumanitarianOpportunity }) {
  const [expanded, setExpanded] = useState(false);
  const colors = URGENCY_COLORS[opportunity.urgency_level];

  return (
    <div className={`rounded-lg border ${colors.bg} ${colors.border}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-opacity-80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colors.bg}`}>
            <Shield className={`w-5 h-5 ${colors.text}`} />
          </div>
          <div className="text-left">
            <div className="font-medium text-gray-800">{opportunity.zone}</div>
            <div className={`text-xs ${colors.text}`}>
              ~{opportunity.affected_population_estimate.toLocaleString()} affected
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors.bg} ${colors.text} ${colors.border} border`}>
            {opportunity.urgency_level.toUpperCase()}
          </span>
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </button>
      {expanded && (
        <div className="p-4 pt-0 space-y-3 border-t border-inherit">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2 bg-white/50 rounded">
              <div className="text-xs text-gray-500">Vulnerability Score</div>
              <div className="text-sm font-semibold text-gray-800">{opportunity.vulnerability_score.toFixed(1)}</div>
            </div>
            <div className="p-2 bg-white/50 rounded">
              <div className="text-xs text-gray-500">Affected Population</div>
              <div className="text-sm font-semibold text-gray-800">{opportunity.affected_population_estimate.toLocaleString()}</div>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-gray-600 mb-1">Service Gaps:</div>
            <div className="flex flex-wrap gap-1">
              {opportunity.service_gaps.map((gap, i) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-white/50 rounded-full text-gray-600">
                  {gap}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-blue-700 mb-1">Recommended Interventions:</div>
            <ul className="space-y-1">
              {opportunity.recommended_interventions.map((int, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                  <Lightbulb className="w-3 h-3 text-blue-500" />
                  {int}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">Access Constraints:</div>
            <div className="flex flex-wrap gap-1">
              {opportunity.access_constraints.map((c, i) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-red-50 rounded-full text-red-700">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Priority Intervention Card
function InterventionCard({ intervention }: { intervention: PriorityIntervention }) {
  const colors = intervention.urgency_score >= 90 ? PRIORITY_COLORS.critical :
                 intervention.urgency_score >= 70 ? PRIORITY_COLORS.high :
                 intervention.urgency_score >= 50 ? PRIORITY_COLORS.medium : PRIORITY_COLORS.low;

  return (
    <div className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colors.bg}`}>
            <Zap className={`w-5 h-5 ${colors.text}`} />
          </div>
          <div>
            <div className="font-medium text-gray-800">{intervention.zone}</div>
            <div className="text-xs text-gray-500">{intervention.intervention_type.replace(/_/g, ' ')}</div>
          </div>
        </div>
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors.bg} ${colors.text}`}>
          Urgency: {intervention.urgency_score}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="p-2 bg-white/50 rounded text-center">
          <div className="text-xs text-gray-500">Agents</div>
          <div className="text-sm font-semibold text-gray-800">{intervention.resource_allocation.field_agents}</div>
        </div>
        <div className="p-2 bg-white/50 rounded text-center">
          <div className="text-xs text-gray-500">Vehicles</div>
          <div className="text-sm font-semibold text-gray-800">{intervention.resource_allocation.vehicles}</div>
        </div>
        <div className="p-2 bg-white/50 rounded text-center">
          <div className="text-xs text-gray-500">Budget</div>
          <div className="text-sm font-semibold text-gray-800">${intervention.resource_allocation.budget_estimate}</div>
        </div>
      </div>

      <div>
        <div className="text-xs font-medium text-gray-600 mb-1">Actions:</div>
        <ul className="space-y-1">
          {intervention.recommended_actions.slice(0, 3).map((action, i) => (
            <li key={i} className="text-sm text-gray-600">{i + 1}. {action}</li>
          ))}
        </ul>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>Timeline: {intervention.timeline}</span>
        <span>Impact: {intervention.impact_score}</span>
      </div>
    </div>
  );
}

// Strategic Recommendation Card
function StrategicCard({ recommendation }: { recommendation: StrategicRecommendation }) {
  const colors = PRIORITY_COLORS[recommendation.priority];

  const categoryIcons = {
    expansion: TrendingUp,
    optimization: BarChart2,
    humanitarian: Shield,
    commercial: DollarSign,
    consolidation: Layers,
  };

  const Icon = categoryIcons[recommendation.category] ?? Lightbulb;

  return (
    <div className={`p-5 rounded-xl border ${colors.bg} ${colors.border}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colors.bg}`}>
            <Icon className={`w-6 h-6 ${colors.text}`} />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{recommendation.title}</h4>
            <p className="text-sm text-gray-600 mt-1">{recommendation.description}</p>
          </div>
        </div>
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors.bg} ${colors.text} ${colors.border} border`}>
          {recommendation.priority.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-2 bg-white/50 rounded">
          <div className="text-xs text-gray-500">Est. Value</div>
          <div className="text-sm font-semibold text-gray-800">${recommendation.estimated_value.toLocaleString()}</div>
        </div>
        <div className="p-2 bg-white/50 rounded">
          <div className="text-xs text-gray-500">Confidence</div>
          <div className="text-sm font-semibold text-gray-800">{(recommendation.confidence * 100).toFixed(0)}%</div>
        </div>
        <div className="p-2 bg-white/50 rounded">
          <div className="text-xs text-gray-500">Timeline</div>
          <div className="text-sm font-semibold text-gray-800">{recommendation.timeline}</div>
        </div>
      </div>

      <div>
        <div className="text-xs font-medium text-gray-600 mb-2">Implementation Steps:</div>
        <ol className="space-y-1">
          {recommendation.implementation_steps.slice(0, 4).map((step, i) => (
            <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
              <span className="text-blue-500 font-medium">{i + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {recommendation.impact_areas.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-medium text-gray-500 mb-1">Impact Areas:</div>
          <div className="flex flex-wrap gap-1">
            {recommendation.impact_areas.slice(0, 5).map((area, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-white/50 rounded-full text-gray-600">
                {area}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Trend Indicator
function TrendIndicator({ trend }: { trend: 'improving' | 'stable' | 'declining' | 'worsening' }) {
  if (trend === 'improving') {
    return <span className="flex items-center gap-1 text-emerald-600"><ArrowUpRight className="w-4 h-4" /> Improving</span>;
  } else if (trend === 'declining' || trend === 'worsening') {
    return <span className="flex items-center gap-1 text-red-600"><ArrowDownRight className="w-4 h-4" /> {trend.charAt(0).toUpperCase() + trend.slice(1)}</span>;
  }
  return <span className="flex items-center gap-1 text-amber-600"><Minus className="w-4 h-4" /> Stable</span>;
}

// Generate Analysis Modal
function GenerateAnalysisModal({
  open,
  onClose,
  onGenerate,
  generating,
}: {
  open: boolean;
  onClose: () => void;
  onGenerate: (horizon: PredictionHorizon) => void;
  generating: boolean;
}) {
  const [horizon, setHorizon] = useState<PredictionHorizon>('30d');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generate AI Analysis"
      footer={
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-sm">
            Cancel
          </button>
          <button
            onClick={() => onGenerate(horizon)}
            disabled={generating}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Analyzing...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" /> Generate
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Generate predictive intelligence analysis including expansion recommendations, commercial opportunities, humanitarian priorities, and strategic forecasts.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Prediction Horizon</label>
          <div className="grid grid-cols-4 gap-2">
            {HORIZON_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setHorizon(opt.value)}
                className={`p-3 rounded-xl border-2 text-center ${
                  horizon === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="font-medium text-gray-800">{opt.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-xl">
          <div className="text-xs font-semibold text-gray-600 mb-2">ANALYSIS OUTPUTS:</div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
            <span>Expansion Recommendations</span>
            <span>Commercial Opportunities</span>
            <span>Humanitarian Opportunities</span>
            <span>Coverage Optimizations</span>
            <span>Route Optimizations</span>
            <span>Priority Interventions</span>
            <span>Risk Forecasts</span>
            <span>Growth Forecasts</span>
            <span>Strategic Recommendations</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// Main Page
export function TerritorialAIDashboard() {
  const { org } = useOrg();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [analysis, setAnalysis] = useState<AIPredictionEngineOutput | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'expansion' | 'humanitarian' | 'interventions' | 'forecasts' | 'strategic'>('overview');

  const handleGenerate = useCallback(async (horizon: PredictionHorizon) => {
    if (!org) return;
    setGenerating(true);
    setShowGenerateModal(false);

    try {
      const result = await territorialAIEngine.generateAnalysis(org.id, horizon);
      setAnalysis(result);
      await territorialAIEngine.saveAnalysis(result);
    } catch (e) {
      console.error('Failed to generate AI analysis:', e);
    } finally {
      setGenerating(false);
    }
  }, [org]);

  // Summary stats
  const summaryStats = analysis ? {
    expansion: analysis.expansion_recommendations.length,
    commercial: analysis.commercial_opportunities.length,
    humanitarian: analysis.humanitarian_opportunities.length,
    interventions: analysis.priority_interventions.length,
    strategic: analysis.strategic_recommendations.length,
    confidence: analysis.confidence_level,
  } : null;

  return (
    <div>
      <PageHeader
        title="Territorial AI Engine"
        subtitle="Predictive intelligence and strategic recommendations"
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowGenerateModal(true)}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Analyzing...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" /> Generate Analysis
                </>
              )}
            </button>
          </div>
        }
      />

      {!analysis ? (
        <EmptyState
          icon={<Brain className="w-6 h-6" />}
          title="No AI Analysis Generated"
          description="Generate predictive intelligence analysis for strategic recommendations."
        />
      ) : (
        <div className="space-y-6">
          {/* Summary Stats */}
          {summaryStats && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                <TrendingUp className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                <div className="text-2xl font-bold text-gray-900">{summaryStats.expansion}</div>
                <div className="text-xs text-gray-500">Expansion</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                <DollarSign className="w-5 h-5 mx-auto text-emerald-500 mb-1" />
                <div className="text-2xl font-bold text-gray-900">{summaryStats.commercial}</div>
                <div className="text-xs text-gray-500">Commercial</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                <Shield className="w-5 h-5 mx-auto text-red-500 mb-1" />
                <div className="text-2xl font-bold text-gray-900">{summaryStats.humanitarian}</div>
                <div className="text-xs text-gray-500">Humanitarian</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                <Zap className="w-5 h-5 mx-auto text-orange-500 mb-1" />
                <div className="text-2xl font-bold text-gray-900">{summaryStats.interventions}</div>
                <div className="text-xs text-gray-500">Interventions</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                <Lightbulb className="w-5 h-5 mx-auto text-purple-500 mb-1" />
                <div className="text-2xl font-bold text-gray-900">{summaryStats.strategic}</div>
                <div className="text-xs text-gray-500">Strategic</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                <Activity className="w-5 h-5 mx-auto text-cyan-500 mb-1" />
                <div className="text-2xl font-bold text-gray-900">{(summaryStats.confidence * 100).toFixed(0)}%</div>
                <div className="text-xs text-gray-500">Confidence</div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(['overview', 'expansion', 'humanitarian', 'interventions', 'forecasts', 'strategic'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Forecasts Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-800">Risk Trend</h3>
                    {analysis.risk_forecast && <TrendIndicator trend={analysis.risk_forecast.overall_trend} />}
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {analysis.risk_forecast?.forecasts.filter(f => f.predicted_risk === 'high').length ?? 0}
                  </div>
                  <div className="text-sm text-gray-500">High-risk zones predicted</div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-800">Humanitarian Trend</h3>
                    {analysis.vulnerability_forecast && <TrendIndicator trend={analysis.vulnerability_forecast.humanitarian_trend} />}
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {analysis.vulnerability_forecast?.forecasts.filter(f => f.predicted_vulnerability === 'high').length ?? 0}
                  </div>
                  <div className="text-sm text-gray-500">High vulnerability zones</div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="font-bold text-gray-800 mb-3">Growth Potential</h3>
                  <div className="text-3xl font-bold text-emerald-600 mb-2">
                    {analysis.growth_forecast?.total_growth_potential.toLocaleString() ?? 0}
                  </div>
                  <div className="text-sm text-gray-500">Estimated new entities</div>
                </div>
              </div>

              {/* Strategic Recommendations Preview */}
              {analysis.strategic_recommendations.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-4">Top Strategic Recommendations</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysis.strategic_recommendations.slice(0, 4).map((rec) => (
                      <StrategicCard key={rec.id} recommendation={rec} />
                    ))}
                  </div>
                </div>
              )}

              {/* Priority Interventions Preview */}
              {analysis.priority_interventions.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-4">Priority Interventions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {analysis.priority_interventions.slice(0, 6).map((int) => (
                      <InterventionCard key={int.id} intervention={int} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Expansion Tab */}
          {activeTab === 'expansion' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Expansion Recommendations</h3>
                <span className="text-sm text-gray-500">{analysis.expansion_recommendations.length} zones</span>
              </div>
              <div className="space-y-2">
                {analysis.expansion_recommendations.map((rec) => (
                  <ExpansionCard key={rec.id} recommendation={rec} />
                ))}
              </div>
            </div>
          )}

          {/* Humanitarian Tab */}
          {activeTab === 'humanitarian' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Humanitarian Opportunities</h3>
                <span className="text-sm text-gray-500">{analysis.humanitarian_opportunities.length} zones</span>
              </div>
              <div className="space-y-2">
                {analysis.humanitarian_opportunities.map((opp) => (
                  <HumanitarianCard key={opp.id} opportunity={opp} />
                ))}
              </div>
            </div>
          )}

          {/* Interventions Tab */}
          {activeTab === 'interventions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Priority Interventions</h3>
                <span className="text-sm text-gray-500">{analysis.priority_interventions.length} interventions</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.priority_interventions.map((int) => (
                  <InterventionCard key={int.id} intervention={int} />
                ))}
              </div>
            </div>
          )}

          {/* Forecasts Tab */}
          {activeTab === 'forecasts' && (
            <div className="space-y-6">
              {/* Risk Forecast */}
              {analysis.risk_forecast && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800">Risk Forecast ({analysis.risk_forecast.horizon})</h3>
                    <TrendIndicator trend={analysis.risk_forecast.overall_trend} />
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {(['low', 'medium', 'high'] as const).map((level) => (
                      <div key={level} className="p-3 bg-gray-50 rounded">
                        <div className="text-xs text-gray-500 mb-1">Predicted {level}</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {analysis.risk_forecast!.forecasts.filter(f => f.predicted_risk === level).length}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-sm text-gray-500">
                    Confidence: {(analysis.risk_forecast.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              )}

              {/* Vulnerability Forecast */}
              {analysis.vulnerability_forecast && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800">Vulnerability Forecast ({analysis.vulnerability_forecast.horizon})</h3>
                    <TrendIndicator trend={analysis.vulnerability_forecast.humanitarian_trend} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {(['low', 'medium', 'high'] as const).map((level) => (
                      <div key={level} className="p-3 bg-gray-50 rounded">
                        <div className="text-xs text-gray-500 mb-1">Predicted {level}</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {analysis.vulnerability_forecast!.forecasts.filter(f => f.predicted_vulnerability === level).length}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Growth Forecast */}
              {analysis.growth_forecast && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="font-bold text-gray-800 mb-4">Growth Zone Forecast ({analysis.growth_forecast.horizon})</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-4 bg-emerald-50 rounded-xl">
                      <div className="text-xs text-gray-500 mb-1">Total Growth Potential</div>
                      <div className="text-3xl font-bold text-emerald-600">
                        {analysis.growth_forecast.total_growth_potential.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <div className="text-xs text-gray-500 mb-1">Recommended Investment Zones</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {analysis.growth_forecast.recommended_investment_zones.length}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.growth_forecast.recommended_investment_zones.map((zone) => (
                      <span key={zone} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                        {zone}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Strategic Tab */}
          {activeTab === 'strategic' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Strategic Recommendations</h3>
                <span className="text-sm text-gray-500">{analysis.strategic_recommendations.length} recommendations</span>
              </div>
              <div className="space-y-4">
                {analysis.strategic_recommendations.map((rec) => (
                  <StrategicCard key={rec.id} recommendation={rec} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Generate Modal */}
      <GenerateAnalysisModal
        open={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGenerate}
        generating={generating}
      />
    </div>
  );
}

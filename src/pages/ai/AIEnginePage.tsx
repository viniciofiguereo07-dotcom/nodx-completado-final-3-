import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Brain, Send, Sparkles, TrendingUp, AlertTriangle,
  Lightbulb, BarChart2, FileSearch, RefreshCw, Clock,
  ChevronDown, CheckCircle, XCircle, Loader
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import type { AIQuery } from '../../types';

const QUERY_TYPES: Array<{ type: AIQuery['query_type']; label: string; icon: React.ComponentType<{ className?: string }>; color: string; description: string }> = [
  { type: 'general', label: 'General Query', icon: Brain, color: '#6366f1', description: 'Ask anything about your operations' },
  { type: 'summary', label: 'Summarize', icon: FileSearch, color: '#3b82f6', description: 'Get a summary of recent activity' },
  { type: 'anomaly', label: 'Anomaly Detection', icon: AlertTriangle, color: '#f59e0b', description: 'Find unusual patterns in data' },
  { type: 'trend', label: 'Trend Analysis', icon: TrendingUp, color: '#22c55e', description: 'Identify trends over time' },
  { type: 'recommendation', label: 'Recommendations', icon: Lightbulb, color: '#8b5cf6', description: 'Get operational recommendations' },
  { type: 'classification', label: 'Classification', icon: BarChart2, color: '#06b6d4', description: 'Classify and categorize data' },
];

const EXAMPLE_PROMPTS = [
  'Summarize visit activity from the last 7 days',
  'Which territories have the lowest form submission rates?',
  'Detect any anomalies in inventory levels',
  'What are the top performing field agents this month?',
  'Identify routes with incomplete visits',
  'Recommend territories that need more resources',
];

// Simulated AI response generator
function generateAIResponse(prompt: string, queryType: AIQuery['query_type'], stats: Record<string, number>): { summary: string; insights: AIQuery['insights'] } {
  const templates: Record<string, { summary: string; insights: AIQuery['insights'] }> = {
    summary: {
      summary: `Based on your operational data, your organization has ${stats.visits ?? 0} total visits with a completion rate of ${stats.completedVisits && stats.visits ? Math.round((stats.completedVisits / stats.visits) * 100) : 0}%. You have ${stats.territories ?? 0} territories, ${stats.routes ?? 0} routes, and ${stats.members ?? 0} active team members. Form submission volume stands at ${stats.submissions ?? 0} total submissions.`,
      insights: [
        { type: 'info', message: `${stats.completedVisits ?? 0} of ${stats.visits ?? 0} visits completed`, severity: 'info' },
        { type: 'info', message: `${stats.submissions ?? 0} form submissions collected`, severity: 'info' },
      ],
    },
    anomaly: {
      summary: `Anomaly detection analysis completed. ${stats.inventoryLow ?? 0} inventory items are below reorder threshold, which may indicate unusual consumption patterns. ${stats.pendingSubmissions ?? 0} form submissions are pending review for extended periods.`,
      insights: [
        { type: 'warning', message: `${stats.inventoryLow ?? 0} inventory items below reorder threshold`, severity: 'warning' },
        { type: 'info', message: 'No unusual visit completion rate deviations detected', severity: 'info' },
      ],
    },
    recommendation: {
      summary: `Based on operational analysis, I recommend: 1) Review routes with 0% completion rate — these may need reassignment. 2) Deploy additional agents to territories with high visit backlogs. 3) Consider consolidating underutilized routes to improve efficiency. 4) Update form templates that haven't received submissions in 30+ days.`,
      insights: [
        { type: 'info', message: 'Consolidate low-activity routes for efficiency', severity: 'info' },
        { type: 'warning', message: 'Some territories may be under-resourced', severity: 'warning' },
        { type: 'info', message: 'Review inactive form templates', severity: 'info' },
      ],
    },
    trend: {
      summary: `Trend analysis for the selected period: Visit volume shows a consistent pattern with peak activity mid-week. Form submission rates track closely with visit completion. Inventory transactions suggest increasing consumption in active territories.`,
      insights: [
        { type: 'info', message: 'Visit activity peaks on Tuesday–Thursday', severity: 'info' },
        { type: 'info', message: 'Positive correlation between routes and submissions', severity: 'info' },
      ],
    },
    general: {
      summary: `Query processed: "${prompt}". Your platform currently manages ${stats.territories ?? 0} territories across ${stats.routes ?? 0} routes, with ${stats.members ?? 0} team members. Overall operational efficiency is within normal parameters based on available metrics.`,
      insights: [{ type: 'info', message: 'All operational systems nominal', severity: 'info' }],
    },
    classification: {
      summary: `Classification analysis completed. Visits categorized: ${Math.round((stats.completedVisits ?? 0) * 0.7)} routine, ${Math.round((stats.visits ?? 0) * 0.2)} priority, ${Math.round((stats.visits ?? 0) * 0.1)} escalation-required. Territories classified by activity level: high (${Math.round((stats.territories ?? 0) * 0.3)}), medium (${Math.round((stats.territories ?? 0) * 0.5)}), low (${Math.round((stats.territories ?? 0) * 0.2)}).`,
      insights: [
        { type: 'info', message: 'Most visits classified as routine operations', severity: 'info' },
        { type: 'warning', message: `${Math.round((stats.visits ?? 0) * 0.1)} visits may require escalation`, severity: 'warning' },
      ],
    },
  };
  return templates[queryType] ?? templates.general;
}

export function AIEnginePage() {
  const { org } = useOrg();
  const { user } = useAuth();
  const [queries, setQueries] = useState<AIQuery[]>([]);
  const [prompt, setPrompt] = useState('');
  const [queryType, setQueryType] = useState<AIQuery['query_type']>('general');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState<Record<string, number>>({});
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!org || !user) return;
    const [{ data: q }, { count: visits }, { count: completedVisits }, { count: territories }, { count: routes }, { count: members }, { count: submissions }] = await Promise.all([
      supabase.from('ai_queries').select('*').eq('organization_id', org.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('visits').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
      supabase.from('visits').select('*', { count: 'exact', head: true }).eq('organization_id', org.id).eq('status', 'completed'),
      supabase.from('territories').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
      supabase.from('routes').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
      supabase.from('organization_members').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
      supabase.from('form_submissions').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
    ]);
    setQueries((q ?? []) as AIQuery[]);
    setStats({ visits: visits ?? 0, completedVisits: completedVisits ?? 0, territories: territories ?? 0, routes: routes ?? 0, members: members ?? 0, submissions: submissions ?? 0 });
    setLoading(false);
  }, [org, user]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit() {
    if (!org || !user || !prompt.trim() || running) return;
    setRunning(true);

    const { data: newQuery } = await supabase.from('ai_queries').insert({
      organization_id: org.id,
      user_id: user.id,
      prompt: prompt.trim(),
      query_type: queryType,
      status: 'running',
    }).select().single();

    const currentPrompt = prompt.trim();
    setPrompt('');

    // Simulate AI processing
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));

    const { summary, insights } = generateAIResponse(currentPrompt, queryType, stats);

    if (newQuery) {
      await supabase.from('ai_queries').update({
        status: 'completed',
        summary,
        insights,
        tokens_used: Math.floor(Math.random() * 1000 + 200),
        completed_at: new Date().toISOString(),
      }).eq('id', newQuery.id);
    }

    setRunning(false);
    await load();
    setTimeout(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
  }

  const selectedType = QUERY_TYPES.find(t => t.type === queryType)!;

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      <PageHeader title="AI Engine" subtitle="Operational intelligence, anomaly detection, and recommendations" />

      <div className="flex gap-6 flex-1 overflow-hidden">
        {/* Query panel */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
          {/* Query type selector */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Query Type</div>
            <div className="space-y-1">
              {QUERY_TYPES.map(({ type, label, icon: Icon, color }) => (
                <button key={type} onClick={() => setQueryType(type)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all text-left ${queryType === type ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '20' }}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className={queryType === type ? 'font-semibold text-blue-700' : 'text-gray-700'}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Example prompts */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Example Prompts</div>
            <div className="space-y-1">
              {EXAMPLE_PROMPTS.map((p, i) => (
                <button key={i} onClick={() => { setPrompt(p); promptRef.current?.focus(); }}
                  className="w-full text-left text-xs text-gray-600 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors leading-relaxed">
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main panel */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Input */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: selectedType.color + '20' }}>
                <selectedType.icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-medium text-gray-700">{selectedType.label}</span>
              <span className="text-xs text-gray-400">— {selectedType.description}</span>
            </div>
            <textarea
              ref={promptRef}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your operational data..."
              rows={3}
              className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-400">⌘+Enter to submit</span>
              <button
                onClick={handleSubmit}
                disabled={running || !prompt.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {running ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {running ? 'Processing...' : 'Submit Query'}
              </button>
            </div>
          </div>

          {/* Results */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4">
            {running && (
              <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <Brain className="w-5 h-5 text-blue-600 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-800">Processing your query...</div>
                    <div className="text-xs text-gray-400 mt-0.5">Analyzing operational data</div>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center text-gray-400 text-sm py-8">Loading...</div>
            ) : queries.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center">
                <Brain className="w-12 h-12 text-gray-200 mb-4" />
                <div className="text-gray-500 font-medium">No queries yet</div>
                <div className="text-gray-400 text-sm mt-1">Ask your first question to get AI-powered insights</div>
              </div>
            ) : (
              queries.map(q => {
                const meta = QUERY_TYPES.find(t => t.type === q.query_type) ?? QUERY_TYPES[0];
                return (
                  <div key={q.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    {/* Query header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: meta.color + '20' }}>
                          <meta.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{q.prompt}</div>
                          <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {new Date(q.created_at).toLocaleString()}
                            {q.tokens_used > 0 && <span>· {q.tokens_used} tokens</span>}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={q.status} />
                    </div>

                    {q.status === 'completed' && q.summary && (
                      <>
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 mb-3">
                          <div className="flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-gray-700 leading-relaxed">{q.summary}</p>
                          </div>
                        </div>

                        {(q.insights as AIQuery['insights'])?.length > 0 && (
                          <div className="space-y-2">
                            {(q.insights as AIQuery['insights']).map((insight, i) => (
                              <div key={i} className={`flex items-start gap-2 p-3 rounded-xl text-sm ${
                                insight.severity === 'critical' ? 'bg-red-50 text-red-700 border border-red-100' :
                                insight.severity === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                'bg-gray-50 text-gray-600 border border-gray-100'
                              }`}>
                                {insight.severity === 'warning' ? <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> :
                                 insight.severity === 'critical' ? <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> :
                                 <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                                {insight.message}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {q.status === 'failed' && q.error && (
                      <div className="p-3 bg-red-50 rounded-xl text-sm text-red-700">{q.error}</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

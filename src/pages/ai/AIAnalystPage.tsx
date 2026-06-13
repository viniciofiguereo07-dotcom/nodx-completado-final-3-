import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles, Brain, MessageSquare, TrendingUp, AlertTriangle, BarChart2,
  Map, Send, RefreshCw, Plus, Pin, Loader2, ChevronRight, Clock, CheckCircle2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import type { AIQuery, AIInsight, AIInsightType } from '../../types';

type ContextType = 'Indicators' | 'Projects' | 'Diagnostics' | 'Maps' | 'Evidence';

const INSIGHT_TYPE_COLORS: Record<AIInsightType, { bg: string; text: string; dot: string }> = {
  risk_summary: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-600' },
  project_status: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-600' },
  indicator_trend: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-600' },
  forecast: { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-600' },
  recommendation: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-600' },
  anomaly: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-600' },
  summary: { bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-600' },
};

const SUGGESTED_QUESTIONS = [
  'Which territories have the highest risk level?',
  'Which projects are currently delayed?',
  'Which indicators are deteriorating most rapidly?',
  'What are the key data quality issues?',
  'Which areas need urgent intervention?',
];

const CONTEXT_TYPES: ContextType[] = ['Indicators', 'Projects', 'Diagnostics', 'Maps', 'Evidence'];

function getStatusBadgeColor(status: AIQuery['status']): string {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-700';
    case 'processing':
      return 'bg-blue-100 text-blue-700';
    case 'completed':
      return 'bg-green-100 text-green-700';
    case 'failed':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function simulateAIResponse(question: string): string {
  const responses: Record<string, string> = {
    'risk': `Based on current data analysis, the following territories show elevated risk indicators:
- Northern region: 78% risk score (trending up)
- Southern zone: 65% risk score (stable)
- Central district: 52% risk score (trending down)

Risk drivers include data quality issues (15% gap), delayed project activities (8 projects), and deteriorating health indicators in 3 territories. Recommend immediate review of northern region protocols.`,

    'delay': `Project Status Summary:
- 12 projects on schedule (67%)
- 4 projects delayed (22%)
  - Project Alpha: 3 weeks behind, cause: resource constraints
  - Project Beta: 2 weeks behind, cause: pending approvals
  - Project Gamma: 1 week behind, cause: data collection delays
  - Project Delta: 4 weeks behind (critical), cause: field staff shortage
- 2 projects completed (11%)

Recommended actions: Reallocate resources to Project Delta, approve pending Project Beta deliverables, and schedule risk mitigation for Projects Alpha and Gamma.`,

    'indicator': `Key Indicator Trends (30-day analysis):
- WASH indicators: +12% (positive trend)
- Food security: -8% (concerning trend)
- Health coverage: +3% (stable)
- Education attendance: -15% (deteriorating)
- Livelihood metrics: +5% (positive)

Critical findings:
- 5 indicators approaching or exceeding alert thresholds
- Data quality score: 82/100
- 2 indicators have significant data gaps (>20%)

Recommendations: Prioritize data collection for Food Security and Education metrics, investigate anomalies in Health coverage, and implement targeted interventions in declining areas.`,
  };

  const key = Object.keys(responses).find(k => question.toLowerCase().includes(k));
  return (key ? responses[key] : undefined) || `Analysis for: "${question}"

Your data shows:
- 127 total records analyzed
- 8 anomalies detected
- 3 critical alerts generated
- Confidence: 92%

Key findings: The analysis reveals operational patterns consistent with normal parameters. Cross-territorial variations are within expected ranges. Data quality is adequate for decision-making at the regional level. Consider enhancing collection protocols in remote zones to improve confidence levels.

Next steps: Review flagged items, adjust thresholds if needed, and monitor trends weekly.`;
}

export function AIAnalystPage() {
  const { org } = useOrg();
  const { user } = useAuth();
  const [queryHistory, setQueryHistory] = useState<AIQuery[]>([]);
  const [currentQuery, setCurrentQuery] = useState<AIQuery | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [selectedContexts, setSelectedContexts] = useState<ContextType[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingQuery, setProcessingQuery] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load query history
  const loadQueryHistory = useCallback(async () => {
    if (!org || !user) return;

    try {
      const { data, error } = await supabase
        .from('ai_queries')
        .select('*')
        .eq('organization_id', org.id)
        .eq('asked_by', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setQueryHistory(data ?? []);

      // Load the most recent query if available
      if (data && data.length > 0) {
        setCurrentQuery(data[0]);
      }
    } catch (err) {
      console.error('Error loading query history:', err);
    }
  }, [org, user]);

  // Load insights
  const loadInsights = useCallback(async () => {
    if (!org) return;

    try {
      const { data, error } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('organization_id', org.id)
        .order('generated_at', { ascending: false })
        .limit(12);

      if (error) throw error;
      setInsights(data ?? []);
    } catch (err) {
      console.error('Error loading insights:', err);
    }
  }, [org]);

  useEffect(() => {
    loadQueryHistory();
    loadInsights();
  }, [loadQueryHistory, loadInsights]);

  const toggleContext = (context: ContextType) => {
    setSelectedContexts(prev =>
      prev.includes(context) ? prev.filter(c => c !== context) : [...prev, context]
    );
  };

  const submitQuery = async () => {
    if (!org || !user || !currentQuestion.trim()) return;

    setProcessingQuery(true);

    try {
      // Create query record
      const { data: newQuery, error: insertError } = await supabase
        .from('ai_queries')
        .insert({
          organization_id: org.id,
          asked_by: user.id,
          question: currentQuestion,
          context_types: selectedContexts,
          context_ids: [],
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setCurrentQuery(newQuery);

      // Simulate processing with timeout
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate answer generation
      const answer = simulateAIResponse(currentQuestion);

      // Update query with answer
      const { error: updateError } = await supabase
        .from('ai_queries')
        .update({
          status: 'completed',
          answer,
          confidence: Math.round(85 + Math.random() * 15),
          completed_at: new Date().toISOString(),
        })
        .eq('id', newQuery.id);

      if (updateError) throw updateError;

      // Reload query history and current query
      await loadQueryHistory();
      setCurrentQuestion('');

      // Auto-focus textarea
      setTimeout(() => textareaRef.current?.focus(), 100);
    } catch (err) {
      console.error('Error submitting query:', err);
    } finally {
      setProcessingQuery(false);
    }
  };

  const loadHistoryQuery = (query: AIQuery) => {
    setCurrentQuery(query);
  };

  const togglePinInsight = async (insightId: string, currentPin: boolean) => {
    try {
      const { error } = await supabase
        .from('ai_insights')
        .update({ is_pinned: !currentPin })
        .eq('id', insightId);

      if (error) throw error;

      setInsights(prev =>
        prev.map(insight =>
          insight.id === insightId ? { ...insight, is_pinned: !currentPin } : insight
        )
      );
    } catch (err) {
      console.error('Error toggling pin:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Sparkles className="w-6 h-6 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">AI Analyst</h1>
          </div>
          <p className="text-slate-400">Operational intelligence for NODX Enterprise</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Query History */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700 bg-slate-900">
                <h2 className="font-semibold text-white text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  Query History
                </h2>
              </div>

              <div className="divide-y divide-slate-700 max-h-96 overflow-y-auto">
                {queryHistory.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No queries yet</p>
                  </div>
                ) : (
                  queryHistory.map(query => (
                    <button
                      key={query.id}
                      onClick={() => loadHistoryQuery(query)}
                      className={`w-full text-left px-4 py-3 transition hover:bg-slate-700 ${
                        currentQuery?.id === query.id ? 'bg-blue-600/20 border-l-2 border-blue-500' : ''
                      }`}
                    >
                      <p className="text-sm font-medium text-white line-clamp-2 mb-1">
                        {query.question}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className={`px-2 py-0.5 rounded text-white ${getStatusBadgeColor(query.status)}`}>
                          {query.status === 'processing' && <Loader2 className="w-3 h-3 inline animate-spin mr-1" />}
                          {query.status}
                        </span>
                        {query.confidence && (
                          <span>{query.confidence}%</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Query View & Answer */}
          <div className="lg:col-span-2 space-y-6">
            {/* Question Input */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700 bg-slate-900">
                <h2 className="font-semibold text-white text-sm flex items-center gap-2">
                  <Brain className="w-4 h-4 text-blue-400" />
                  Ask a Question
                </h2>
              </div>

              <div className="p-4 space-y-4">
                {/* Question Textarea */}
                <div>
                  <textarea
                    ref={textareaRef}
                    value={currentQuestion}
                    onChange={(e) => setCurrentQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        submitQuery();
                      }
                    }}
                    placeholder="Ask me anything about your operations, indicators, projects, risks..."
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                    rows={4}
                    disabled={processingQuery}
                  />
                </div>

                {/* Context Selector */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Context (optional)</label>
                  <div className="flex flex-wrap gap-2">
                    {CONTEXT_TYPES.map(context => (
                      <button
                        key={context}
                        onClick={() => toggleContext(context)}
                        disabled={processingQuery}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                          selectedContexts.includes(context)
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        } disabled:opacity-50`}
                      >
                        {context}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Send Button */}
                <button
                  onClick={submitQuery}
                  disabled={processingQuery || !currentQuestion.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:opacity-50 text-white font-medium rounded-lg transition"
                >
                  {processingQuery ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Query
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Answer Display */}
            {currentQuery && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700 bg-slate-900 flex items-center justify-between">
                  <h2 className="font-semibold text-white text-sm flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-green-400" />
                    Answer
                  </h2>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusBadgeColor(currentQuery.status)}`}>
                    {currentQuery.status === 'processing' && <Loader2 className="w-3 h-3 inline animate-spin mr-1" />}
                    {currentQuery.status}
                  </span>
                </div>

                <div className="p-4">
                  {currentQuery.status === 'pending' || currentQuery.status === 'processing' ? (
                    <div className="py-8 text-center">
                      <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
                      <p className="text-slate-400">Processing your query...</p>
                    </div>
                  ) : currentQuery.status === 'completed' && currentQuery.answer ? (
                    <div className="space-y-4">
                      <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                        <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                          {currentQuery.answer}
                        </p>
                      </div>

                      {currentQuery.confidence && (
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-green-500 to-blue-500 h-full"
                              style={{ width: `${currentQuery.confidence}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-400">
                            {currentQuery.confidence}% confident
                          </span>
                        </div>
                      )}
                    </div>
                  ) : currentQuery.status === 'failed' ? (
                    <div className="py-8 text-center">
                      <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-4" />
                      <p className="text-slate-400">Failed to process query</p>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* Suggested Questions */}
            {!currentQuery && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700 bg-slate-900">
                  <h2 className="font-semibold text-white text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Suggested Questions
                  </h2>
                </div>

                <div className="p-4 space-y-2">
                  {SUGGESTED_QUESTIONS.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentQuestion(question);
                        textareaRef.current?.focus();
                      }}
                      className="w-full text-left px-4 py-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm transition flex items-center justify-between group"
                    >
                      <span>{question}</span>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pinned Insights Section */}
        {insights.length > 0 && (
          <div className="max-w-6xl mx-auto mt-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-blue-400" />
              AI Insights
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insights.map(insight => {
                const colors = INSIGHT_TYPE_COLORS[insight.insight_type];

                return (
                  <div
                    key={insight.id}
                    className={`${colors.bg} border border-slate-600 rounded-lg overflow-hidden transition hover:shadow-lg`}
                  >
                    <div className="p-4 border-b border-slate-600">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${colors.bg} ${colors.text} capitalize`}>
                          {insight.insight_type.replace(/_/g, ' ')}
                        </span>
                        <button
                          onClick={() => togglePinInsight(insight.id, insight.is_pinned)}
                          className="text-slate-500 hover:text-yellow-400 transition"
                        >
                          <Pin
                            className={`w-4 h-4 ${insight.is_pinned ? 'fill-yellow-400 text-yellow-400' : ''}`}
                          />
                        </button>
                      </div>
                      <h3 className="font-semibold text-slate-900 text-sm">{insight.title}</h3>
                    </div>

                    <div className="p-4 space-y-3">
                      <p className="text-sm text-slate-700 line-clamp-3">{insight.content}</p>

                      {insight.confidence && (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <div className="flex-1 bg-slate-300 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-blue-600 h-full"
                              style={{ width: `${insight.confidence}%` }}
                            />
                          </div>
                          <span className="font-medium">{insight.confidence}%</span>
                        </div>
                      )}

                      <div className="text-xs text-slate-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(insight.generated_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

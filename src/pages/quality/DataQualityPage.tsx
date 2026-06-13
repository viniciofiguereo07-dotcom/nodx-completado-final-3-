'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  CheckSquare,
  AlertTriangle,
  XCircle,
  Info,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  Filter,
  BarChart2,
  Shield,
  Zap,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import type {
  DataQualityRule,
  DataQualityIssue,
  DataQualityCheckType,
} from '../../types';

type Tab = 'issues' | 'rules' | 'analysis';
type SeverityFilter = 'all' | 'error' | 'warning' | 'info';
type IssueStatusFilter = 'all' | 'open' | 'acknowledged' | 'fixed' | 'false_positive';

export function DataQualityPage() {
  const { org } = useOrg();
  const { user } = useAuth();

  // State management
  const [activeTab, setActiveTab] = useState<Tab>('issues');
  const [issues, setIssues] = useState<DataQualityIssue[]>([]);
  const [rules, setRules] = useState<DataQualityRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [statusFilter, setStatusFilter] = useState<IssueStatusFilter>('all');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [processingIssueId, setProcessingIssueId] = useState<string | null>(null);

  const orgId = org?.id;

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!orgId) return;

    setLoading(true);
    try {
      const [issuesRes, rulesRes] = await Promise.all([
        supabase
          .from('data_quality_issues')
          .select(
            `
            id,
            organization_id,
            rule_id,
            record_type,
            record_id,
            severity,
            issue_code,
            description,
            field_path,
            status,
            fixed_by,
            fixed_at,
            created_at,
            rule:data_quality_rules(*)
            `
          )
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('data_quality_rules')
          .select('*')
          .eq('organization_id', orgId)
          .eq('is_active', true),
      ]);

      if (issuesRes.data) setIssues(issuesRes.data as unknown as DataQualityIssue[]);
      if (rulesRes.data) setRules(rulesRes.data);
    } catch (err) {
      console.error('Error fetching quality data:', err);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleAcknowledge = async (issueId: string) => {
    if (!orgId || !user) return;

    setProcessingIssueId(issueId);
    try {
      const { error } = await supabase
        .from('data_quality_issues')
        .update({ status: 'acknowledged' })
        .eq('id', issueId)
        .eq('organization_id', orgId);

      if (!error) {
        setIssues((prev) =>
          prev.map((issue) =>
            issue.id === issueId ? { ...issue, status: 'acknowledged' } : issue
          )
        );
      }
    } catch (err) {
      console.error('Error acknowledging issue:', err);
    } finally {
      setProcessingIssueId(null);
    }
  };

  const handleMarkFixed = async (issueId: string) => {
    if (!orgId || !user) return;

    setProcessingIssueId(issueId);
    try {
      const { error } = await supabase
        .from('data_quality_issues')
        .update({
          status: 'fixed',
          fixed_by: user.id,
          fixed_at: new Date().toISOString(),
        })
        .eq('id', issueId)
        .eq('organization_id', orgId);

      if (!error) {
        setIssues((prev) =>
          prev.map((issue) =>
            issue.id === issueId
              ? {
                  ...issue,
                  status: 'fixed',
                  fixed_by: user.id,
                  fixed_at: new Date().toISOString(),
                }
              : issue
          )
        );
      }
    } catch (err) {
      console.error('Error marking issue as fixed:', err);
    } finally {
      setProcessingIssueId(null);
    }
  };

  const handleMarkFalsePositive = async (issueId: string) => {
    if (!orgId || !user) return;

    setProcessingIssueId(issueId);
    try {
      const { error } = await supabase
        .from('data_quality_issues')
        .update({ status: 'false_positive' })
        .eq('id', issueId)
        .eq('organization_id', orgId);

      if (!error) {
        setIssues((prev) =>
          prev.map((issue) =>
            issue.id === issueId ? { ...issue, status: 'false_positive' } : issue
          )
        );
      }
    } catch (err) {
      console.error('Error marking as false positive:', err);
    } finally {
      setProcessingIssueId(null);
    }
  };

  // Compute statistics
  const stats = {
    total: issues.length,
    errors: issues.filter((i) => i.severity === 'error').length,
    warnings: issues.filter((i) => i.severity === 'warning').length,
    avgScore: 78, // Mock value as per specs
  };

  // Filter issues
  const filteredIssues = issues.filter((issue) => {
    const matchesSeverity = severityFilter === 'all' || issue.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || issue.status === statusFilter;
    const matchesSearch =
      searchTerm === '' ||
      issue.issue_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.record_type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSeverity && matchesStatus && matchesSearch;
  });

  // Score distribution for analysis tab
  const scoreDistribution = {
    critical: issues.filter((i) => i.severity === 'error').length, // 0-20
    poor: Math.floor(stats.total * 0.1), // 21-40
    fair: Math.floor(stats.total * 0.2), // 41-60
    good: Math.floor(stats.total * 0.4), // 61-80
    excellent: Math.floor(stats.total * 0.3), // 81-100
  };

  const checkTypeColorMap: Record<DataQualityCheckType, string> = {
    duplicate: 'bg-purple-100 text-purple-800',
    impossible_gps: 'bg-red-100 text-red-800',
    missing_evidence: 'bg-orange-100 text-orange-800',
    inconsistent_dates: 'bg-amber-100 text-amber-800',
    invalid_value: 'bg-red-100 text-red-800',
    incomplete_survey: 'bg-yellow-100 text-yellow-800',
    orphan_record: 'bg-gray-100 text-gray-800',
    range_check: 'bg-blue-100 text-blue-800',
    cross_field: 'bg-indigo-100 text-indigo-800',
    temporal_consistency: 'bg-cyan-100 text-cyan-800',
    custom: 'bg-slate-100 text-slate-800',
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return null;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800';
      case 'acknowledged':
        return 'bg-yellow-100 text-yellow-800';
      case 'fixed':
        return 'bg-green-100 text-green-800';
      case 'false_positive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Data Quality Engine</h1>
                <p className="text-sm text-gray-600 mt-1">Monitor and manage data integrity</p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* KPI Strip */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Issues</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-orange-400 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Open Errors</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{stats.errors}</p>
              </div>
              <XCircle className="w-10 h-10 text-red-400 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Open Warnings</p>
                <p className="text-3xl font-bold text-amber-600 mt-2">{stats.warnings}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-amber-400 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Avg Quality Score</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.avgScore}%</p>
              </div>
              <BarChart2 className="w-10 h-10 text-blue-400 opacity-20" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200 flex">
            {(['issues', 'rules', 'analysis'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-6 py-4 font-medium transition-colors border-b-2 ${
                  activeTab === tab
                    ? 'text-blue-600 border-b-blue-600 bg-blue-50'
                    : 'text-gray-600 border-b-transparent hover:text-gray-900 hover:bg-slate-50'
                }`}
              >
                {tab === 'issues' && <span className="flex items-center gap-2 justify-center"><AlertTriangle className="w-4 h-4" /> Issues</span>}
                {tab === 'rules' && <span className="flex items-center gap-2 justify-center"><CheckSquare className="w-4 h-4" /> Rules</span>}
                {tab === 'analysis' && <span className="flex items-center gap-2 justify-center"><BarChart2 className="w-4 h-4" /> Score Analysis</span>}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Issues Tab */}
            {activeTab === 'issues' && (
              <div>
                {/* Search and Filters */}
                <div className="mb-6 space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by code, description, or record type..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                      <Filter className="w-4 h-4" />
                      More Filters
                    </button>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mr-2">Severity:</label>
                      <div className="flex gap-2 inline-flex">
                        {(['all', 'error', 'warning', 'info'] as const).map((sev) => (
                          <button
                            key={sev}
                            onClick={() => setSeverityFilter(sev)}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                              severityFilter === sev
                                ? sev === 'all'
                                  ? 'bg-gray-800 text-white'
                                  : sev === 'error'
                                  ? 'bg-red-600 text-white'
                                  : sev === 'warning'
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {sev.charAt(0).toUpperCase() + sev.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mr-2">Status:</label>
                      <div className="flex gap-2 inline-flex">
                        {(['all', 'open', 'acknowledged', 'fixed', 'false_positive'] as const).map((st) => (
                          <button
                            key={st}
                            onClick={() => setStatusFilter(st)}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                              statusFilter === st
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {st.replace('_', ' ').charAt(0).toUpperCase() + st.replace('_', ' ').slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Issues List */}
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-gray-500">Loading issues...</div>
                  </div>
                ) : filteredIssues.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3 opacity-50" />
                    <p className="text-gray-600 font-medium">No issues found</p>
                    <p className="text-gray-500 text-sm mt-1">Great job! All data quality checks are passing.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredIssues.map((issue) => (
                      <div
                        key={issue.id}
                        className="flex items-start gap-4 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex-shrink-0 pt-1">
                          {getSeverityIcon(issue.severity)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800">
                                  {issue.issue_code}
                                </span>
                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getStatusBadgeColor(issue.status)}`}>
                                  {issue.status}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-gray-900">{issue.description}</p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                                <span>Record: {issue.record_type}</span>
                                {issue.field_path && <span>Field: {issue.field_path}</span>}
                                <span>Created: {new Date(issue.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            {issue.status === 'open' && (
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  onClick={() => handleAcknowledge(issue.id)}
                                  disabled={processingIssueId === issue.id}
                                  className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:bg-gray-50 transition-colors"
                                >
                                  Acknowledge
                                </button>
                                <button
                                  onClick={() => handleMarkFixed(issue.id)}
                                  disabled={processingIssueId === issue.id}
                                  className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 disabled:bg-green-50 transition-colors"
                                >
                                  Mark Fixed
                                </button>
                                <button
                                  onClick={() => handleMarkFalsePositive(issue.id)}
                                  disabled={processingIssueId === issue.id}
                                  className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200 disabled:bg-blue-50 transition-colors"
                                >
                                  False Positive
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Rules Tab */}
            {activeTab === 'rules' && (
              <div>
                <div className="mb-4 flex justify-end">
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Plus className="w-4 h-4" />
                    New Rule
                  </button>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-gray-500">Loading rules...</div>
                  </div>
                ) : rules.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield className="w-12 h-12 text-blue-400 mx-auto mb-3 opacity-50" />
                    <p className="text-gray-600 font-medium">No quality rules configured</p>
                    <p className="text-gray-500 text-sm mt-1">Create your first data quality rule to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rules.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-start gap-4 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${checkTypeColorMap[rule.check_type]}`}>
                              {rule.check_type.replace(/_/g, ' ')}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                              rule.severity === 'error' ? 'bg-red-100 text-red-800' :
                              rule.severity === 'warning' ? 'bg-amber-100 text-amber-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {rule.severity}
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-800">
                              Score: {rule.score_impact}
                            </span>
                          </div>
                          <h3 className="font-medium text-gray-900">{rule.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                            <span>Applies to: {rule.applies_to}</span>
                            {rule.field_path && <span>Field: {rule.field_path}</span>}
                            <span>Status: <span className={`font-medium ${rule.is_active ? 'text-green-600' : 'text-gray-500'}`}>{rule.is_active ? 'Active' : 'Inactive'}</span></span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Score Analysis Tab */}
            {activeTab === 'analysis' && (
              <div>
                <div className="space-y-8">
                  {/* Distribution Bars */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-500" />
                      Quality Score Distribution
                    </h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Critical (0-20)', value: scoreDistribution.critical, color: 'bg-red-500', percentage: Math.round((scoreDistribution.critical / stats.total) * 100) || 0 },
                        { label: 'Poor (21-40)', value: scoreDistribution.poor, color: 'bg-orange-500', percentage: Math.round((scoreDistribution.poor / stats.total) * 100) || 0 },
                        { label: 'Fair (41-60)', value: scoreDistribution.fair, color: 'bg-yellow-500', percentage: Math.round((scoreDistribution.fair / stats.total) * 100) || 0 },
                        { label: 'Good (61-80)', value: scoreDistribution.good, color: 'bg-blue-500', percentage: Math.round((scoreDistribution.good / stats.total) * 100) || 0 },
                        { label: 'Excellent (81-100)', value: scoreDistribution.excellent, color: 'bg-green-500', percentage: Math.round((scoreDistribution.excellent / stats.total) * 100) || 0 },
                      ].map((bucket, idx) => (
                        <div key={idx}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{bucket.label}</span>
                            <span className="text-sm font-semibold text-gray-900">{bucket.value} ({bucket.percentage}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all ${bucket.color}`}
                              style={{ width: `${bucket.percentage || 0}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary Donut */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <BarChart2 className="w-5 h-5 text-blue-500" />
                      Overall Quality Summary
                    </h3>
                    <div className="flex items-center gap-8">
                      <div className="relative w-48 h-48">
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="10"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="10"
                            strokeDasharray={`${stats.avgScore * 2.827} ${283.7}`}
                            strokeLinecap="round"
                            transform="rotate(-90 50 50)"
                            opacity="0.8"
                          />
                          <text x="50" y="55" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#374151">
                            {stats.avgScore}%
                          </text>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-xs text-green-600 font-medium">Excellent Quality</p>
                            <p className="text-lg font-bold text-green-700 mt-1">{scoreDistribution.excellent}</p>
                          </div>
                          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                            <p className="text-xs text-yellow-600 font-medium">Issues Found</p>
                            <p className="text-lg font-bold text-yellow-700 mt-1">{stats.total}</p>
                          </div>
                          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                            <p className="text-xs text-red-600 font-medium">Critical Issues</p>
                            <p className="text-lg font-bold text-red-700 mt-1">{stats.errors}</p>
                          </div>
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-xs text-blue-600 font-medium">Active Rules</p>
                            <p className="text-lg font-bold text-blue-700 mt-1">{rules.length}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataQualityPage;

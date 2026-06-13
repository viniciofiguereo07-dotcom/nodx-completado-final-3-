'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  ArrowRight,
  MessageSquare,
  RefreshCw,
  Plus,
  Filter,
  User,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import type {
  ApprovalWorkflow,
  ApprovalInstance,
  ApprovalStageRecord,
  ApprovalStatus,
  ApprovalAction,
} from '../../types';

type Tab = 'queue' | 'workflows' | 'history';

interface ExtendedApprovalInstance extends ApprovalInstance {
  workflow?: ApprovalWorkflow;
  stage_records?: ApprovalStageRecord[];
}

export function ApprovalWorkflowPage() {
  const { org } = useOrg();
  const { user } = useAuth();

  // State management
  const [activeTab, setActiveTab] = useState<Tab>('queue');
  const [instances, setInstances] = useState<ExtendedApprovalInstance[]>([]);
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [stageRecords, setStageRecords] = useState<ApprovalStageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showCommentInput, setShowCommentInput] = useState<string | null>(null);
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null);

  const orgId = org?.id;

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!orgId) return;

    setLoading(true);
    try {
      const [instancesRes, workflowsRes, stageRecordsRes] = await Promise.all([
        supabase
          .from('approval_instances')
          .select(
            `
            id,
            organization_id,
            workflow_id,
            record_type,
            record_id,
            current_stage,
            status,
            submitted_by,
            submitted_at,
            completed_at,
            metadata,
            created_at,
            updated_at,
            workflow:approval_workflows(*),
            stage_records:approval_stage_records(*)
            `
          )
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('approval_workflows')
          .select('*')
          .eq('organization_id', orgId)
          .eq('is_active', true),
        supabase
          .from('approval_stage_records')
          .select('*')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
          .limit(200),
      ]);

      if (instancesRes.data) setInstances(instancesRes.data as unknown as ExtendedApprovalInstance[]);
      if (workflowsRes.data) setWorkflows(workflowsRes.data);
      if (stageRecordsRes.data) setStageRecords(stageRecordsRes.data);
    } catch (err) {
      console.error('Error fetching approval data:', err);
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

  const handleSubmit = async (instanceId: string) => {
    if (!orgId || !user) return;

    setProcessingId(instanceId);
    try {
      const { error } = await supabase
        .from('approval_instances')
        .update({
          status: 'submitted',
          submitted_by: user.id,
          submitted_at: new Date().toISOString(),
        })
        .eq('id', instanceId)
        .eq('organization_id', orgId);

      if (!error) {
        setInstances((prev) =>
          prev.map((inst) =>
            inst.id === instanceId
              ? {
                  ...inst,
                  status: 'submitted',
                  submitted_by: user.id,
                  submitted_at: new Date().toISOString(),
                }
              : inst
          )
        );
        setShowCommentInput(null);
        setCommentText('');
      }
    } catch (err) {
      console.error('Error submitting approval:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleApprove = async (instanceId: string) => {
    if (!orgId || !user) return;

    setProcessingId(instanceId);
    try {
      const instance = instances.find((i) => i.id === instanceId);
      if (!instance) return;

      const nextStage = (instance.current_stage || 0) + 1;
      const isLastStage = !instance.workflow || nextStage >= instance.workflow.stages.length;

      // Create stage record
      await supabase.from('approval_stage_records').insert({
        organization_id: orgId,
        instance_id: instanceId,
        stage_index: instance.current_stage,
        stage_name: instance.workflow?.stages[instance.current_stage]?.name || 'Unknown',
        action: 'approved',
        actor_id: user.id,
        comment: commentText || null,
      });

      // Update instance
      const { error } = await supabase
        .from('approval_instances')
        .update({
          status: isLastStage ? 'approved' : 'under_review',
          current_stage: isLastStage ? instance.current_stage : nextStage,
          completed_at: isLastStage ? new Date().toISOString() : null,
        })
        .eq('id', instanceId)
        .eq('organization_id', orgId);

      if (!error) {
        await fetchData();
        setShowCommentInput(null);
        setCommentText('');
      }
    } catch (err) {
      console.error('Error approving:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (instanceId: string) => {
    if (!orgId || !user) return;

    setProcessingId(instanceId);
    try {
      const instance = instances.find((i) => i.id === instanceId);
      if (!instance) return;

      // Create stage record
      await supabase.from('approval_stage_records').insert({
        organization_id: orgId,
        instance_id: instanceId,
        stage_index: instance.current_stage,
        stage_name: instance.workflow?.stages[instance.current_stage]?.name || 'Unknown',
        action: 'rejected',
        actor_id: user.id,
        comment: commentText || null,
        rejection_reason: rejectionReason || null,
      });

      // Update instance
      const { error } = await supabase
        .from('approval_instances')
        .update({
          status: 'rejected',
          completed_at: new Date().toISOString(),
        })
        .eq('id', instanceId)
        .eq('organization_id', orgId);

      if (!error) {
        await fetchData();
        setShowRejectInput(null);
        setCommentText('');
        setRejectionReason('');
      }
    } catch (err) {
      console.error('Error rejecting:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Compute statistics
  const pendingCount = instances.filter(
    (i) => i.status !== 'approved' && i.status !== 'rejected'
  ).length;
  const approvedToday = instances.filter(
    (i) =>
      i.status === 'approved' &&
      new Date(i.completed_at || '').toDateString() === new Date().toDateString()
  ).length;
  const rejectedCount = instances.filter((i) => i.status === 'rejected').length;

  const getStatusPipelineColor = (status: ApprovalStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-200 text-gray-800';
      case 'submitted':
        return 'bg-blue-200 text-blue-800';
      case 'under_review':
        return 'bg-amber-200 text-amber-800';
      case 'validated':
        return 'bg-purple-200 text-purple-800';
      case 'approved':
        return 'bg-emerald-200 text-emerald-800';
      case 'rejected':
        return 'bg-red-200 text-red-800';
      case 'withdrawn':
        return 'bg-slate-200 text-slate-800';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  const getActionBadgeColor = (action: ApprovalAction) => {
    switch (action) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'returned':
        return 'bg-amber-100 text-amber-800';
      case 'commented':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatUserDisplay = (userId: string) => {
    return userId.slice(0, 8).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-purple-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Approval Workflow</h1>
                <p className="text-sm text-gray-600 mt-1">Manage records through approval stages</p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
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
                <p className="text-sm text-gray-600 font-medium">Pending Review</p>
                <p className="text-3xl font-bold text-amber-600 mt-2">{pendingCount}</p>
              </div>
              <Clock className="w-10 h-10 text-amber-400 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Approved Today</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{approvedToday}</p>
              </div>
              <CheckCircle2 className="w-10 h-10 text-green-400 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Rejected</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{rejectedCount}</p>
              </div>
              <XCircle className="w-10 h-10 text-red-400 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Workflows Active</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{workflows.length}</p>
              </div>
              <Send className="w-10 h-10 text-blue-400 opacity-20" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200 flex">
            {(['queue', 'workflows', 'history'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-6 py-4 font-medium transition-colors border-b-2 ${
                  activeTab === tab
                    ? 'text-purple-600 border-b-purple-600 bg-purple-50'
                    : 'text-gray-600 border-b-transparent hover:text-gray-900 hover:bg-slate-50'
                }`}
              >
                {tab === 'queue' && <span className="flex items-center gap-2 justify-center"><Clock className="w-4 h-4" /> Queue</span>}
                {tab === 'workflows' && <span className="flex items-center gap-2 justify-center"><ArrowRight className="w-4 h-4" /> Workflows</span>}
                {tab === 'history' && <span className="flex items-center gap-2 justify-center"><MessageSquare className="w-4 h-4" /> History</span>}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Queue Tab */}
            {activeTab === 'queue' && (
              <div>
                <div className="mb-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-gray-900">Pending Approvals</h3>
                    <p className="text-sm text-gray-600 mt-1">{pendingCount} records awaiting review</p>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                    <Filter className="w-4 h-4" />
                    Filter
                  </button>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-gray-500">Loading approvals...</div>
                  </div>
                ) : instances.filter((i) => i.status !== 'approved' && i.status !== 'rejected').length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3 opacity-50" />
                    <p className="text-gray-600 font-medium">No pending approvals</p>
                    <p className="text-gray-500 text-sm mt-1">All records are either approved or rejected.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {instances
                      .filter((i) => i.status !== 'approved' && i.status !== 'rejected')
                      .map((instance) => (
                        <div
                          key={instance.id}
                          className="p-4 border border-slate-200 rounded-lg hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800">
                                  {instance.record_type}
                                </span>
                              </div>
                              <p className="font-medium text-gray-900">Record: {instance.record_id.slice(0, 12)}</p>
                            </div>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusPipelineColor(instance.status)}`}>
                              {instance.status.replace(/_/g, ' ')}
                            </span>
                          </div>

                          {/* Pipeline visualization */}
                          {instance.workflow && (
                            <div className="mb-4 flex items-center gap-1 overflow-x-auto pb-2">
                              {instance.workflow.stages.map((stage, idx) => (
                                <React.Fragment key={stage.index}>
                                  <div
                                    className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                                      idx <= (instance.current_stage || 0)
                                        ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-300'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    {idx + 1}. {stage.name}
                                  </div>
                                  {idx < (instance.workflow?.stages.length ?? 0) - 1 && (
                                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          )}

                          {/* Action buttons and comment input */}
                          {(instance.status === 'draft' || instance.status === 'submitted') && (
                            <div className="space-y-2">
                              {instance.status === 'draft' && (
                                <button
                                  onClick={() => handleSubmit(instance.id)}
                                  disabled={processingId === instance.id}
                                  className="w-full px-3 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 disabled:bg-gray-100 font-medium text-sm transition-colors"
                                >
                                  <Send className="w-4 h-4 inline mr-2" />
                                  Submit for Review
                                </button>
                              )}
                              {instance.status === 'submitted' && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleApprove(instance.id)}
                                    disabled={processingId === instance.id}
                                    className="flex-1 px-3 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 disabled:bg-gray-100 font-medium text-sm transition-colors"
                                  >
                                    <CheckCircle2 className="w-4 h-4 inline mr-2" />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => setShowRejectInput(showRejectInput === instance.id ? null : instance.id)}
                                    className="flex-1 px-3 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 font-medium text-sm transition-colors"
                                  >
                                    <XCircle className="w-4 h-4 inline mr-2" />
                                    Reject
                                  </button>
                                </div>
                              )}
                              {showRejectInput === instance.id && (
                                <div className="bg-red-50 p-3 rounded-lg border border-red-200 space-y-2">
                                  <textarea
                                    placeholder="Rejection reason..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="w-full px-2 py-2 border border-red-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    rows={2}
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleReject(instance.id)}
                                      disabled={processingId === instance.id}
                                      className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                                    >
                                      Confirm Rejection
                                    </button>
                                    <button
                                      onClick={() => setShowRejectInput(null)}
                                      className="flex-1 px-3 py-2 bg-gray-200 text-gray-800 rounded text-sm font-medium hover:bg-gray-300 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Workflows Tab */}
            {activeTab === 'workflows' && (
              <div>
                <div className="mb-4 flex justify-end">
                  <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                    <Plus className="w-4 h-4" />
                    New Workflow
                  </button>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-gray-500">Loading workflows...</div>
                  </div>
                ) : workflows.length === 0 ? (
                  <div className="text-center py-12">
                    <ArrowRight className="w-12 h-12 text-purple-400 mx-auto mb-3 opacity-50" />
                    <p className="text-gray-600 font-medium">No approval workflows configured</p>
                    <p className="text-gray-500 text-sm mt-1">Create your first workflow to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {workflows.map((workflow) => (
                      <div key={workflow.id} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="mb-3">
                          <h3 className="font-semibold text-gray-900">{workflow.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{workflow.description}</p>
                        </div>

                        <div className="mb-3 flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-800">
                            {workflow.applies_to}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${workflow.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {workflow.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        {/* Stages timeline */}
                        <div className="flex items-center gap-1 overflow-x-auto pb-2">
                          {workflow.stages.map((stage, idx) => (
                            <React.Fragment key={stage.index}>
                              <div className="px-3 py-2 bg-purple-100 text-purple-800 rounded-lg text-xs font-medium whitespace-nowrap">
                                {stage.index + 1}. {stage.name}
                              </div>
                              {idx < workflow.stages.length - 1 && (
                                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-gray-500">Loading history...</div>
                  </div>
                ) : stageRecords.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-50" />
                    <p className="text-gray-600 font-medium">No approval history</p>
                    <p className="text-gray-500 text-sm mt-1">Approval actions will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stageRecords.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-start gap-4 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex-shrink-0 pt-1">
                          {record.action === 'approved' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                          {record.action === 'rejected' && <XCircle className="w-5 h-5 text-red-600" />}
                          {record.action === 'submitted' && <Send className="w-5 h-5 text-blue-600" />}
                          {record.action === 'returned' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                          {record.action === 'commented' && <MessageSquare className="w-5 h-5 text-gray-600" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getActionBadgeColor(record.action)}`}>
                                  {record.action}
                                </span>
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800">
                                  {record.stage_name}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                by <span className="font-medium text-gray-900">{formatUserDisplay(record.actor_id)}</span>
                              </p>
                              {record.comment && (
                                <p className="text-sm text-gray-700 mt-2 italic">"{record.comment.slice(0, 100)}{record.comment.length > 100 ? '...' : ''}"</p>
                              )}
                              {record.rejection_reason && (
                                <p className="text-sm text-red-700 mt-2 font-medium">Reason: {record.rejection_reason.slice(0, 100)}{record.rejection_reason.length > 100 ? '...' : ''}</p>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 whitespace-nowrap">
                              {new Date(record.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApprovalWorkflowPage;

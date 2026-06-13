import { useState, useEffect, useRef, useCallback } from 'react';
import { GitBranch, Plus, Play, Archive, CreditCard as Edit2, Trash2, AlertCircle, Zap, FileText, CheckCircle, ThumbsUp, Package, BarChart2, Brain, Bell, GitMerge, Circle, History, Clock, CheckCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import type { Workflow, WorkflowNode, WorkflowEdge, WorkflowExecution } from '../../types';

const NODE_TYPES: Array<{ type: WorkflowNode['type']; label: string; color: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = [
  { type: 'trigger', label: 'Trigger', color: '#22c55e', icon: Zap },
  { type: 'form', label: 'Form', color: '#3b82f6', icon: FileText },
  { type: 'validation', label: 'Validation', color: '#f59e0b', icon: CheckCircle },
  { type: 'review', label: 'Review', color: '#8b5cf6', icon: ThumbsUp },
  { type: 'approval', label: 'Approval', color: '#06b6d4', icon: CheckCheck },
  { type: 'inventory', label: 'Inventory', color: '#f97316', icon: Package },
  { type: 'analytics', label: 'Analytics', color: '#ec4899', icon: BarChart2 },
  { type: 'ai', label: 'AI Processing', color: '#6366f1', icon: Brain },
  { type: 'notification', label: 'Notification', color: '#14b8a6', icon: Bell },
  { type: 'condition', label: 'Condition', color: '#eab308', icon: GitMerge },
  { type: 'end', label: 'End', color: '#ef4444', icon: Circle },
];

const NODE_W = 140;
const NODE_H = 48;

function WorkflowCanvas({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onMoveNode,
  onDeleteNode,
  onAddEdge,
  connectMode,
  setConnectMode,
  connectFrom,
  setConnectFrom,
}: {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onMoveNode: (id: string, x: number, y: number) => void;
  onDeleteNode: (id: string) => void;
  onAddEdge: (from: string, to: string) => void;
  connectMode: boolean;
  setConnectMode: (v: boolean) => void;
  connectFrom: string | null;
  setConnectFrom: (v: string | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{ nodeId: string; startX: number; startY: number; nodeX: number; nodeY: number } | null>(null);
  const [svgOffset, setSvgOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) setSvgOffset({ x: rect.left, y: rect.top });
  }, []);

  function handleNodeMouseDown(e: React.MouseEvent, nodeId: string) {
    e.stopPropagation();
    if (connectMode) {
      if (!connectFrom) {
        setConnectFrom(nodeId);
      } else if (connectFrom !== nodeId) {
        onAddEdge(connectFrom, nodeId);
        setConnectFrom(null);
        setConnectMode(false);
      }
      return;
    }
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    onSelectNode(nodeId);
    setDragging({ nodeId, startX: e.clientX, startY: e.clientY, nodeX: node.x, nodeY: node.y });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    const dx = e.clientX - dragging.startX;
    const dy = e.clientY - dragging.startY;
    onMoveNode(dragging.nodeId, dragging.nodeX + dx, dragging.nodeY + dy);
  }

  function handleMouseUp() { setDragging(null); }

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      style={{ cursor: connectMode ? 'crosshair' : dragging ? 'grabbing' : 'default', backgroundColor: '#f8fafc' }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={e => { if (e.target === svgRef.current) { onSelectNode(null); setConnectFrom(null); } }}
    >
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="1"/>
        </pattern>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="8" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" />
        </marker>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />

      {/* Edges */}
      {edges.map(edge => {
        const src = nodeMap.get(edge.source);
        const tgt = nodeMap.get(edge.target);
        if (!src || !tgt) return null;
        const x1 = src.x + NODE_W / 2;
        const y1 = src.y + NODE_H / 2;
        const x2 = tgt.x + NODE_W / 2;
        const y2 = tgt.y + NODE_H / 2;
        const mx = (x1 + x2) / 2;
        return (
          <g key={edge.id}>
            <path d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`} fill="none" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />
            {edge.label && <text x={mx} y={(y1 + y2) / 2 - 6} textAnchor="middle" fontSize="10" fill="#64748b">{edge.label}</text>}
          </g>
        );
      })}

      {/* Nodes */}
      {nodes.map(node => {
        const meta = NODE_TYPES.find(t => t.type === node.type) ?? NODE_TYPES[0];
        const isSelected = selectedNodeId === node.id;
        const isConnectSrc = connectFrom === node.id;
        return (
          <g key={node.id} transform={`translate(${node.x}, ${node.y})`} style={{ cursor: 'grab' }}
            onMouseDown={e => handleNodeMouseDown(e, node.id)}>
            {/* Shadow */}
            <rect x={2} y={3} width={NODE_W} height={NODE_H} rx={10} fill="rgba(0,0,0,0.08)" />
            {/* Body */}
            <rect
              width={NODE_W} height={NODE_H} rx={10}
              fill="white"
              stroke={isSelected ? '#3b82f6' : isConnectSrc ? meta.color : '#e2e8f0'}
              strokeWidth={isSelected || isConnectSrc ? 2 : 1}
            />
            {/* Color bar */}
            <rect x={0} y={0} width={5} height={NODE_H} rx={10} fill={meta.color} />
            <rect x={0} y={10} width={5} height={NODE_H - 20} fill={meta.color} />
            {/* Label */}
            <text x={16} y={NODE_H / 2 + 5} fontSize="12" fontWeight="600" fill="#1e293b">{node.label}</text>
          </g>
        );
      })}

      {/* Connect from indicator */}
      {connectFrom && (
        <text x="50%" y="20" textAnchor="middle" fontSize="12" fill="#3b82f6">
          Click target node to connect — ESC to cancel
        </text>
      )}
    </svg>
  );
}

export function WorkflowEnginePage() {
  const { org } = useOrg();
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editTarget, setEditTarget] = useState<Workflow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Workflow | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectMode, setConnectMode] = useState(false);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [bName, setBName] = useState('');
  const [bDesc, setBDesc] = useState('');
  const [bTrigger, setBTrigger] = useState<Workflow['trigger_type']>('manual');
  const [bNodes, setBNodes] = useState<WorkflowNode[]>([]);
  const [bEdges, setBEdges] = useState<WorkflowEdge[]>([]);
  const [saving, setSaving] = useState(false);
  const [showExec, setShowExec] = useState<Workflow | null>(null);

  const load = useCallback(async () => {
    if (!org) return;
    const [{ data: w }, { data: e }] = await Promise.all([
      supabase.from('workflows').select('*').eq('organization_id', org.id).order('created_at', { ascending: false }),
      supabase.from('workflow_executions').select('*').eq('organization_id', org.id).order('started_at', { ascending: false }).limit(20),
    ]);
    setWorkflows((w ?? []) as Workflow[]);
    setExecutions((e ?? []) as WorkflowExecution[]);
    setLoading(false);
  }, [org]);

  useEffect(() => { load(); }, [load]);

  function openEditor(workflow?: Workflow) {
    if (workflow) {
      setEditTarget(workflow);
      setBName(workflow.name);
      setBDesc(workflow.description ?? '');
      setBTrigger(workflow.trigger_type);
      setBNodes(workflow.definition.nodes ?? []);
      setBEdges(workflow.definition.edges ?? []);
    } else {
      setEditTarget(null);
      setBName('');
      setBDesc('');
      setBTrigger('manual');
      const triggerNode: WorkflowNode = { id: 'n_trigger', type: 'trigger', label: 'Start', x: 60, y: 60, config: {} };
      const endNode: WorkflowNode = { id: 'n_end', type: 'end', label: 'End', x: 400, y: 60, config: {} };
      setBNodes([triggerNode, endNode]);
      setBEdges([{ id: 'e_0', source: 'n_trigger', target: 'n_end' }]);
    }
    setSelectedNodeId(null);
    setView('editor');
  }

  function addNode(type: WorkflowNode['type']) {
    const meta = NODE_TYPES.find(t => t.type === type)!;
    const id = `n_${Date.now()}`;
    const node: WorkflowNode = { id, type, label: meta.label, x: 100 + Math.random() * 300, y: 100 + Math.random() * 200, config: {} };
    setBNodes(p => [...p, node]);
    setSelectedNodeId(id);
  }

  function moveNode(id: string, x: number, y: number) {
    setBNodes(p => p.map(n => n.id === id ? { ...n, x, y } : n));
  }

  function deleteNode(id: string) {
    setBNodes(p => p.filter(n => n.id !== id));
    setBEdges(p => p.filter(e => e.source !== id && e.target !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  }

  function addEdge(from: string, to: string) {
    if (bEdges.find(e => e.source === from && e.target === to)) return;
    setBEdges(p => [...p, { id: `e_${Date.now()}`, source: from, target: to }]);
  }

  function updateSelectedLabel(label: string) {
    if (!selectedNodeId) return;
    setBNodes(p => p.map(n => n.id === selectedNodeId ? { ...n, label } : n));
  }

  const selectedNode = bNodes.find(n => n.id === selectedNodeId);

  async function handleSave(activate = false) {
    if (!org || !user) return;
    setSaving(true);
    const definition = { nodes: bNodes, edges: bEdges };
    const payload = {
      organization_id: org.id,
      name: bName,
      description: bDesc || null,
      definition,
      trigger_type: bTrigger,
      status: activate ? 'active' : (editTarget?.status ?? 'draft'),
      created_by: user.id,
    };
    if (editTarget) {
      await supabase.from('workflows').update(payload).eq('id', editTarget.id);
    } else {
      await supabase.from('workflows').insert(payload);
    }
    setSaving(false);
    setView('list');
    await load();
  }

  async function executeWorkflow(workflow: Workflow) {
    if (!org || !user) return;
    const firstNode = workflow.definition.nodes.find(n => n.type === 'trigger');
    await supabase.from('workflow_executions').insert({
      organization_id: org.id,
      workflow_id: workflow.id,
      triggered_by: user.id,
      status: 'running',
      current_node: firstNode?.id ?? null,
      logs: [{ timestamp: new Date().toISOString(), node: firstNode?.id ?? '', message: 'Workflow started', level: 'info' }],
    });
    await supabase.from('workflows').update({ execution_count: workflow.execution_count + 1, last_executed_at: new Date().toISOString() }).eq('id', workflow.id);
    await load();
  }

  if (view === 'editor') {
    return (
      <div className="h-[calc(100vh-7rem)] flex flex-col">
        <PageHeader
          title={editTarget ? `Edit: ${editTarget.name}` : 'New Workflow'}
          breadcrumb={[{ label: 'Workflows' }, { label: 'Editor' }]}
          actions={
            <div className="flex items-center gap-3">
              <button onClick={() => setConnectMode(!connectMode)} className={`px-3 py-2 text-sm rounded-xl border transition-colors ${connectMode ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}>
                Connect Nodes
              </button>
              <button onClick={() => setView('list')} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleSave(false)} disabled={saving || !bName} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">Save Draft</button>
              <button onClick={() => handleSave(true)} disabled={saving || !bName} className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                <Play className="w-4 h-4" /> Activate
              </button>
            </div>
          }
        />

        <div className="flex gap-4 flex-1 overflow-hidden">
          {/* Node palette */}
          <div className="w-48 flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-3 overflow-y-auto">
            <div className="mb-2">
              <input type="text" value={bName} onChange={e => setBName(e.target.value)} placeholder="Workflow name..." className="w-full px-2 py-1.5 text-sm font-semibold border-none outline-none" />
            </div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Add Node</div>
            <div className="space-y-1">
              {NODE_TYPES.map(({ type, label, color, icon: Icon }) => (
                <button key={type} onClick={() => addNode(type)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '20' }}>
                    <Icon className="w-3 h-3" style={{ color }} />
                  </div>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative">
            <WorkflowCanvas
              nodes={bNodes}
              edges={bEdges}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              onMoveNode={moveNode}
              onDeleteNode={deleteNode}
              onAddEdge={addEdge}
              connectMode={connectMode}
              setConnectMode={setConnectMode}
              connectFrom={connectFrom}
              setConnectFrom={setConnectFrom}
            />
          </div>

          {/* Properties panel */}
          <div className="w-52 flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 overflow-y-auto">
            {selectedNode ? (
              <>
                <div className="text-sm font-semibold text-gray-700 mb-3">Node Properties</div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Label</label>
                    <input type="text" value={selectedNode.label} onChange={e => updateSelectedLabel(e.target.value)}
                      className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Type</label>
                    <div className="mt-1 text-sm text-gray-600 capitalize">{selectedNode.type}</div>
                  </div>
                  <div className="text-xs text-gray-400">
                    Position: {Math.round(selectedNode.x)}, {Math.round(selectedNode.y)}
                  </div>
                  <button onClick={() => deleteNode(selectedNode.id)} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-red-600 border border-red-200 rounded-xl hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5" /> Remove Node
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-semibold text-gray-700 mb-3">Workflow Settings</div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Trigger</label>
                    <select value={bTrigger} onChange={e => setBTrigger(e.target.value as Workflow['trigger_type'])}
                      className="w-full mt-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {['manual', 'form_submit', 'visit_complete', 'inventory_low', 'schedule'].map(t => (
                        <option key={t} value={t}>{t.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Nodes</label>
                    <div className="text-sm text-gray-700 mt-1">{bNodes.length}</div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Connections</label>
                    <div className="text-sm text-gray-700 mt-1">{bEdges.length}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Workflow Engine"
        subtitle="Design, automate, and track operational workflows"
        actions={
          <button onClick={() => openEditor()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New Workflow
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow list */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">Loading...</div>
          ) : workflows.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <EmptyState icon={<GitBranch className="w-6 h-6" />} title="No workflows yet" description="Design your first operational workflow"
                action={<button onClick={() => openEditor()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl"><Plus className="w-4 h-4" />New Workflow</button>}
              />
            </div>
          ) : (
            workflows.map(w => (
              <div key={w.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center">
                      <GitBranch className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{w.name}</div>
                      {w.description && <div className="text-xs text-gray-500">{w.description}</div>}
                    </div>
                  </div>
                  <StatusBadge status={w.status} />
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                  <span>{w.definition.nodes?.length ?? 0} nodes</span>
                  <span>{w.definition.edges?.length ?? 0} connections</span>
                  <span className="capitalize">Trigger: {w.trigger_type.replace('_', ' ')}</span>
                  <span className="flex items-center gap-1"><History className="w-3 h-3" />{w.execution_count} runs</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEditor(w)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-xl hover:bg-gray-50">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  {w.status === 'active' && (
                    <button onClick={() => executeWorkflow(w)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100">
                      <Play className="w-3.5 h-3.5" /> Execute
                    </button>
                  )}
                  <button onClick={() => setShowExec(w)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-xl hover:bg-gray-50">
                    <History className="w-3.5 h-3.5" /> History
                  </button>
                  <button onClick={() => setDeleteTarget(w)} className="ml-auto p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-200 rounded-xl">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Recent executions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="text-sm font-semibold text-gray-700 mb-4">Recent Executions</div>
          {executions.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-8">No executions yet</div>
          ) : (
            <div className="space-y-2">
              {executions.slice(0, 10).map(ex => {
                const wf = workflows.find(w => w.id === ex.workflow_id);
                return (
                  <div key={ex.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ex.status === 'completed' ? 'bg-emerald-500' : ex.status === 'failed' ? 'bg-red-500' : 'bg-blue-500 animate-pulse'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-700 truncate">{wf?.name ?? 'Unknown'}</div>
                      <div className="text-xs text-gray-400">{new Date(ex.started_at).toLocaleString()}</div>
                    </div>
                    <StatusBadge status={ex.status} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Workflow"
        footer={<div className="flex justify-end gap-3"><button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button><button onClick={async () => { await supabase.from('workflows').delete().eq('id', deleteTarget!.id); setDeleteTarget(null); load(); }} className="px-4 py-2 text-sm bg-red-600 text-white font-semibold rounded-xl">Delete</button></div>}
      >
        <div className="flex items-start gap-3 text-sm text-gray-600"><AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />Delete workflow <strong>&nbsp;{deleteTarget?.name}</strong>? All execution history will be lost.</div>
      </Modal>

      {/* Execution history modal */}
      <Modal open={!!showExec} onClose={() => setShowExec(null)} title={`Execution History — ${showExec?.name}`} size="lg">
        <div className="space-y-2">
          {executions.filter(e => e.workflow_id === showExec?.id).length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-4">No executions found</div>
          ) : (
            executions.filter(e => e.workflow_id === showExec?.id).map(ex => (
              <div key={ex.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">{new Date(ex.started_at).toLocaleString()}</span>
                  </div>
                  <StatusBadge status={ex.status} />
                </div>
                {(ex.logs as Array<{ timestamp: string; message: string; level: string }>)?.map((log, i) => (
                  <div key={i} className="text-xs text-gray-500 flex items-center gap-2">
                    <span className={`font-medium ${log.level === 'error' ? 'text-red-500' : log.level === 'warning' ? 'text-amber-500' : 'text-emerald-500'}`}>
                      [{log.level}]
                    </span>
                    {log.message}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}

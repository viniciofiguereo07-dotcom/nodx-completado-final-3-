import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  Calendar,
  User,
  Tag,
  MessageSquare,
  Play,
  Check,
  X,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import type { Task, TaskComment } from '../../types';

export function TasksPage() {
  const { org } = useOrg();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<Map<string, TaskComment[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'my_tasks' | 'all_tasks' | 'board'>('my_tasks');
  const [searchQuery, setSearchQuery] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [showCompletionInput, setShowCompletionInput] = useState(false);

  useEffect(() => {
    if (org) fetchTasks();
  }, [org]);

  const fetchTasks = async () => {
    if (!org) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('organization_id', org.id)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommentsForTask = async (taskId: string) => {
    if (!org) return;
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .eq('organization_id', org.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments((prev) => new Map(prev).set(taskId, data || []));
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'border-l-red-600 bg-red-50';
      case 'high':
        return 'border-l-orange-600 bg-orange-50';
      case 'medium':
        return 'border-l-amber-600 bg-amber-50';
      case 'low':
        return 'border-l-blue-600 bg-blue-50';
      default:
        return 'border-l-gray-600 bg-gray-50';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-700';
      case 'high':
        return 'bg-orange-100 text-orange-700';
      case 'medium':
        return 'bg-amber-100 text-amber-700';
      case 'low':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityDot = (priority: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-600',
      high: 'bg-orange-600',
      medium: 'bg-amber-600',
      low: 'bg-blue-600',
    };
    return colors[priority] || 'bg-gray-600';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-emerald-100 text-emerald-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      case 'blocked':
        return 'bg-orange-100 text-orange-700';
      case 'overdue':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  const isOverdue = (task: Task) => {
    if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') {
      return false;
    }
    return new Date(task.due_date) < new Date();
  };

  const filterTasks = () => {
    let filtered = tasks;

    // Filter by tab
    if (activeTab === 'my_tasks') {
      filtered = filtered.filter((t) => t.assigned_to === user?.id);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          (t.description && t.description.toLowerCase().includes(query))
      );
    }

    return filtered;
  };

  const getTasksByStatus = (status: string) => {
    return filterTasks().filter((t) => t.status === status);
  };

  const filteredTasks = filterTasks();

  const stats = {
    myTasks: tasks.filter((t) => t.assigned_to === user?.id).length,
    overdue: tasks.filter(
      (t) => t.assigned_to === user?.id && isOverdue(t)
    ).length,
    completedToday: tasks.filter(
      (t) => t.assigned_to === user?.id && t.completed_at &&
        new Date(t.completed_at).toDateString() === new Date().toDateString()
    ).length,
    critical: tasks.filter(
      (t) => t.assigned_to === user?.id && t.priority === 'critical'
    ).length,
  };

  const handleToggleExpand = (taskId: string) => {
    setExpandedTasks((prev) => {
      const updated = new Set(prev);
      if (updated.has(taskId)) {
        updated.delete(taskId);
      } else {
        updated.add(taskId);
        fetchCommentsForTask(taskId);
      }
      return updated;
    });
  };

  const handleStartTask = async (task: Task) => {
    if (!org) return;
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'in_progress' })
        .eq('id', task.id);

      if (error) throw error;
      setSelectedTask((prev) => (prev ? { ...prev, status: 'in_progress' } : null));
      fetchTasks();
    } catch (err) {
      console.error('Error starting task:', err);
    }
  };

  const handleCompleteTask = async (task: Task) => {
    if (!org) return;
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completion_notes: completionNotes,
        })
        .eq('id', task.id);

      if (error) throw error;
      setCompletionNotes('');
      setShowCompletionInput(false);
      setSelectedTask(null);
      fetchTasks();
    } catch (err) {
      console.error('Error completing task:', err);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No due date';
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateDescription = (desc: string | null, maxLength: number = 100) => {
    if (!desc) return '';
    return desc.length > maxLength ? desc.substring(0, maxLength) + '...' : desc;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Task Management</h1>
            <p className="text-gray-600 mt-1">Track and manage your action items</p>
          </div>
          <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            <Plus className="w-5 h-5" />
            New Task
          </button>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">My Tasks</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.myTasks}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Overdue</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{stats.overdue}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Completed Today</p>
            <p className="text-3xl font-bold text-emerald-600 mt-2">{stats.completedToday}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Critical Priority</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{stats.critical}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex gap-4 border-b border-gray-200 pb-4">
            {(['my_tasks', 'all_tasks', 'board'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 border-b-2 transition font-medium ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'my_tasks'
                  ? 'My Tasks'
                  : tab === 'all_tasks'
                    ? 'All Tasks'
                    : 'Board'}
              </button>
            ))}
          </div>

          {/* Search - only show for list views */}
          {activeTab !== 'board' && (
            <div className="flex gap-4 mt-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={fetchTasks}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        {activeTab === 'board' ? (
          // Kanban Board View
          <div className="grid grid-cols-4 gap-6">
            {(['pending', 'in_progress', 'completed', 'blocked'] as const).map((status) => (
              <div key={status} className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center justify-between">
                  {status === 'pending'
                    ? 'Pending'
                    : status === 'in_progress'
                      ? 'In Progress'
                      : status === 'completed'
                        ? 'Completed'
                        : 'Blocked'}
                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                    {getTasksByStatus(status).length}
                  </span>
                </h3>
                <div className="space-y-3">
                  {getTasksByStatus(status).map((task) => (
                    <div
                      key={task.id}
                      className={`p-3 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition ${getPriorityColor(
                        task.priority
                      )}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full ${getPriorityDot(task.priority)} mt-1.5`} />
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900 line-clamp-2">
                            {task.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {task.task_type &&
                              task.task_type.charAt(0).toUpperCase() +
                                task.task_type.slice(1).replace('_', ' ')}
                          </p>
                          {task.due_date && (
                            <p className={`text-xs mt-2 ${isOverdue(task) ? 'text-red-600' : 'text-gray-600'}`}>
                              {formatDate(task.due_date)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // List View
          <>
            {filteredTasks.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No tasks found</p>
                <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or create a new task</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((task) => (
                  <div key={task.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    {/* Task Header */}
                    <button
                      onClick={() => handleToggleExpand(task.id)}
                      className={`w-full border-l-4 p-4 hover:bg-gray-50 transition text-left ${getPriorityColor(task.priority)}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-3 h-3 rounded-full ${getPriorityDot(task.priority)}`} />
                            {task.task_type && (
                              <span className="text-xs font-semibold bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                                {task.task_type
                                  .charAt(0)
                                  .toUpperCase() +
                                  task.task_type.slice(1).replace('_', ' ')}
                              </span>
                            )}
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded ${getStatusColor(
                                isOverdue(task) ? 'overdue' : task.status
                              )}`}
                            >
                              {getStatusLabel(isOverdue(task) ? 'overdue' : task.status)}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                          {task.description && (
                            <p className="text-sm text-gray-600 mt-1">{truncateDescription(task.description)}</p>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                            {task.assigned_to && (
                              <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                Assigned
                              </span>
                            )}
                            {task.due_date && (
                              <span
                                className={`flex items-center gap-1 ${
                                  isOverdue(task) ? 'text-red-600 font-semibold' : ''
                                }`}
                              >
                                <Calendar className="w-4 h-4" />
                                {formatDate(task.due_date)}
                              </span>
                            )}
                            {task.tags && task.tags.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Tag className="w-4 h-4" />
                                {task.tags.length}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                            expandedTasks.has(task.id) ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {expandedTasks.has(task.id) && (
                      <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
                        {/* Comments Section */}
                        {comments.get(task.id) && (
                          <div>
                            <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <MessageSquare className="w-4 h-4" />
                              Comments ({comments.get(task.id)?.length || 0})
                            </p>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {comments.get(task.id)?.map((comment) => (
                                <div key={comment.id} className="bg-white rounded p-2 text-xs">
                                  <p className="text-gray-900">{comment.content}</p>
                                  <p className="text-gray-500 text-xs mt-1">{formatDateTime(comment.created_at)}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Completion Notes Input */}
                        {task.status === 'in_progress' && showCompletionInput && (
                          <div>
                            <label className="text-sm font-semibold text-gray-900 block mb-2">
                              Completion Notes
                            </label>
                            <textarea
                              value={completionNotes}
                              onChange={(e) => setCompletionNotes(e.target.value)}
                              placeholder="Add notes about task completion..."
                              className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              rows={3}
                            />
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2 border-t border-gray-200">
                          {task.status === 'pending' && (
                            <button
                              onClick={() => handleStartTask(task)}
                              className="flex items-center justify-center gap-2 flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
                            >
                              <Play className="w-4 h-4" />
                              Start
                            </button>
                          )}
                          {task.status === 'in_progress' && !showCompletionInput && (
                            <button
                              onClick={() => setShowCompletionInput(true)}
                              className="flex items-center justify-center gap-2 flex-1 px-3 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 transition"
                            >
                              <Check className="w-4 h-4" />
                              Complete
                            </button>
                          )}
                          {task.status === 'in_progress' && showCompletionInput && (
                            <button
                              onClick={() => handleCompleteTask(task)}
                              className="flex items-center justify-center gap-2 flex-1 px-3 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 transition"
                            >
                              <Check className="w-4 h-4" />
                              Save & Complete
                            </button>
                          )}
                          <button className="flex items-center justify-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-200 rounded text-sm transition">
                            <XCircle className="w-4 h-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  Plus,
  Search,
  RefreshCw,
  ChevronRight,
  Calendar,
  Users,
  DollarSign,
  Target,
  Activity,
  BarChart2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Archive,
  Filter,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { Program, Project, Activity as ActivityType, ProjectStatus } from '../../types';

type TabType = 'programs' | 'projects' | 'activities';
type FilterStatus = ProjectStatus | 'all';

const statusColors: Record<ProjectStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  active: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  suspended: 'bg-amber-100 text-amber-700 border-amber-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
  archived: 'bg-slate-100 text-slate-700 border-slate-200',
};

const statusDots: Record<ProjectStatus, string> = {
  draft: 'bg-gray-400',
  active: 'bg-blue-500',
  completed: 'bg-emerald-500',
  suspended: 'bg-amber-500',
  cancelled: 'bg-red-500',
  archived: 'bg-slate-500',
};

interface ProjectDetail {
  objectives?: string[];
  geo_coverage?: string;
  activities_count?: number;
}

export const ProjectsPage: React.FC = () => {
  const { org } = useOrg();
  const orgId = org?.id;
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('programs');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);

  const [kpis, setKpis] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalBeneficiaries: 0,
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
      if (activeTab === 'programs') {
        await fetchPrograms();
      } else if (activeTab === 'projects') {
        await fetchProjects();
      } else if (activeTab === 'activities') {
        await fetchActivities();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching programs:', error);
      return;
    }
    setPrograms(data || []);
  };

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        program:programs(name),
        activities:activities(count)
      `)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return;
    }

    const projectsData = data || [];
    setProjects(projectsData);

    // Calculate KPIs
    const totalProjects = projectsData.length;
    const activeProjects = projectsData.filter((p) => p.status === 'active').length;
    const completedProjects = projectsData.filter((p) => p.status === 'completed').length;
    const totalBeneficiaries = projectsData.reduce(
      (sum, p) => sum + (p.beneficiary_target || 0),
      0
    );

    setKpis({
      totalProjects,
      activeProjects,
      completedProjects,
      totalBeneficiaries,
    });
  };

  const fetchActivities = async () => {
    const { data, error } = await supabase
      .from('activities')
      .select(`
        *,
        project:projects(name)
      `)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching activities:', error);
      return;
    }
    setActivities(data || []);
  };

  const handleProjectSelect = async (project: Project) => {
    setSelectedProject(project);
    setShowDetailPanel(true);

    // Fetch detailed project info
    const { data: detail, error } = await supabase
      .from('projects')
      .select('objectives, geo_coverage')
      .eq('id', project.id)
      .single();

    if (!error && detail) {
      const activitiesResponse = await supabase
        .from('activities')
        .select('id')
        .eq('project_id', project.id);

      setProjectDetail({
        objectives: detail.objectives,
        geo_coverage: detail.geo_coverage,
        activities_count: activitiesResponse.data?.length || 0,
      });
    }
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statuses: FilterStatus[] = ['all', 'draft', 'active', 'completed', 'suspended', 'cancelled', 'archived'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FolderKanban className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Project Management</h1>
            </div>
            <button
              onClick={() => console.log('TODO: Open new project modal')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Project
            </button>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <BarChart2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900">{kpis.totalProjects}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">{kpis.activeProjects}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{kpis.completedProjects}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Users className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Beneficiaries</p>
                <p className="text-2xl font-bold text-gray-900">{kpis.totalBeneficiaries.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-6 mb-6 border-b border-gray-200">
          {(['programs', 'projects', 'activities'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSelectedProject(null);
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

        {/* Programs Tab */}
        {activeTab === 'programs' && (
          <div>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : programs.length === 0 ? (
              <div className="text-center py-12">
                <FolderKanban className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No programs yet</h3>
                <p className="text-gray-600">Create your first program to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {programs.map((program) => (
                  <div
                    key={program.id}
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{program.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[program.status]}`}>
                        {program.status}
                      </span>
                    </div>
                    {program.sector && (
                      <p className="text-sm text-gray-600 mb-4">Sector: {program.sector}</p>
                    )}
                    <div className="space-y-3">
                      {program.budget && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-700">Budget: ${program.budget.toLocaleString()}</span>
                        </div>
                      )}
                      {program.start_date && program.end_date && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-700">
                            {new Date(program.start_date).toLocaleDateString()} - {new Date(program.end_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {program.lead_by && (
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-700">Lead: {program.lead_by}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div className="flex gap-6">
            <div className="flex-1">
              {/* Search and Filters */}
              <div className="mb-6 space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search projects..."
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

                {/* Status Filter Chips */}
                <div className="flex gap-2 flex-wrap">
                  {statuses.map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        filterStatus === status
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {status === 'all' ? 'All' : status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Projects List */}
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
                  <p className="text-gray-600">Try adjusting your search or filters</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredProjects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => handleProjectSelect(project)}
                      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{project.name}</h3>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                              {project.program?.name || 'No program'}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${statusColors[project.status]}`}>
                              {project.status}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>

                      {/* Beneficiary Progress */}
                      {project.beneficiary_target && (
                        <div className="mb-3">
                          <div className="flex justify-between items-center text-sm mb-1">
                            <span className="text-gray-600">Beneficiaries</span>
                            <span className="text-gray-900 font-medium">
                              {project.beneficiary_actual || 0} / {project.beneficiary_target}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, ((project.beneficiary_actual || 0) / project.beneficiary_target) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center gap-4">
                          {project.budget && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              ${(project.budget / 1000).toFixed(0)}K
                            </span>
                          )}
                          {project.start_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(project.start_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Detail Panel */}
            {showDetailPanel && selectedProject && (
              <div className="w-80 bg-white rounded-lg border border-gray-200 p-6 sticky top-8 max-h-[calc(100vh-200px)] overflow-y-auto">
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
                    <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Project Name</h3>
                    <p className="text-gray-900">{selectedProject.name}</p>
                  </div>

                  {selectedProject.description && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Description</h3>
                      <p className="text-sm text-gray-700">{selectedProject.description}</p>
                    </div>
                  )}

                  {projectDetail?.objectives && projectDetail.objectives.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Objectives</h3>
                      <ul className="space-y-2">
                        {projectDetail.objectives.map((obj, idx) => (
                          <li key={idx} className="text-sm text-gray-700 flex gap-2">
                            <span className="text-blue-600 font-bold">{idx + 1}.</span>
                            <span>{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {projectDetail?.geo_coverage && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Geographic Coverage</h3>
                      <p className="text-sm text-gray-700">{projectDetail.geo_coverage}</p>
                    </div>
                  )}

                  {projectDetail?.activities_count !== undefined && (
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Activities</span>
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full text-sm font-semibold text-blue-600">
                          {projectDetail.activities_count}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Activities Tab */}
        {activeTab === 'activities' && (
          <div>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No activities yet</h3>
                <p className="text-gray-600">Create activities within your projects</p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Activity Name</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Project</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Target vs Actual</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Assigned To</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Start Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((activity) => (
                      <tr key={activity.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 text-sm text-gray-900">{activity.name}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {(activity as Record<string, any>).project?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${statusColors[activity.status as ProjectStatus]}`}>
                            {activity.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {activity.target_count !== undefined && activity.actual_count !== undefined
                            ? `${activity.actual_count} / ${activity.target_count}`
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">{activity.assigned_to || 'Unassigned'}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {activity.start_date
                            ? new Date(activity.start_date).toLocaleDateString()
                            : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsPage;

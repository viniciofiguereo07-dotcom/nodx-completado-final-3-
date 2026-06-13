import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Filter, X, FolderKanban, FileText, BarChart2, Activity,
  Map, Camera, BookOpen, ClipboardList, ChevronRight, Clock, Tag, Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import type { SearchIndexEntry } from '../../types';

type RecordType = 'all' | 'project' | 'form' | 'indicator' | 'task' | 'document' | 'evidence' | 'diagnostic' | 'map';

interface SearchFilters {
  recordTypes: RecordType[];
  startDate: string;
  endDate: string;
  tags: string[];
}

const RECORD_TYPE_CONFIG: Record<Exclude<RecordType, 'all'>, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  project: { label: 'Projects', icon: FolderKanban, color: 'text-blue-600' },
  form: { label: 'Forms', icon: FileText, color: 'text-green-600' },
  indicator: { label: 'Indicators', icon: BarChart2, color: 'text-purple-600' },
  diagnostic: { label: 'Diagnostics', icon: Activity, color: 'text-red-600' },
  document: { label: 'Documents', icon: BookOpen, color: 'text-amber-600' },
  evidence: { label: 'Evidence', icon: Camera, color: 'text-teal-600' },
  task: { label: 'Tasks', icon: ClipboardList, color: 'text-orange-600' },
  map: { label: 'Maps', icon: Map, color: 'text-cyan-600' },
};

function getIconForRecordType(recordType: string): React.ComponentType<{ className?: string }> {
  const config = RECORD_TYPE_CONFIG[recordType as Exclude<RecordType, 'all'>];
  return config?.icon ?? Search;
}

function getColorForRecordType(recordType: string): string {
  const config = RECORD_TYPE_CONFIG[recordType as Exclude<RecordType, 'all'>];
  return config?.color ?? 'text-gray-600';
}

function highlightMatches(text: string, query: string): React.ReactNode {
  if (!query) return text;

  const regex = new RegExp(`(${query})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, idx) =>
        regex.test(part) ? (
          <mark key={idx} className="bg-yellow-200 font-semibold">
            {part}
          </mark>
        ) : (
          <span key={idx}>{part}</span>
        )
      )}
    </>
  );
}

export function GlobalSearchPage() {
  const { org } = useOrg();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    recordTypes: [],
    startDate: '',
    endDate: '',
    tags: [],
  });

  const [results, setResults] = useState<SearchIndexEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();

  // Auto-focus search on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!query.trim()) {
      // Load recent entries
      debounceTimer.current = setTimeout(() => {
        loadRecent();
      }, 100);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      performSearch();
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query, filters]);

  const loadRecent = useCallback(async () => {
    if (!org) return;

    setLoading(true);
    try {
      let q = supabase
        .from('search_index')
        .select('*')
        .eq('organization_id', org.id)
        .order('indexed_at', { ascending: false })
        .limit(10);

      if (filters.recordTypes.length > 0) {
        q = q.in('record_type', filters.recordTypes);
      }

      const { data, error } = await q;

      if (error) throw error;
      setResults(data ?? []);
    } catch (err) {
      console.error('Error loading recent entries:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [org, filters.recordTypes]);

  const performSearch = useCallback(async () => {
    if (!org || !query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const searchTerm = `%${query}%`;

      let q = supabase
        .from('search_index')
        .select('*')
        .eq('organization_id', org.id)
        .or(`title.ilike.${searchTerm},body.ilike.${searchTerm}`)
        .limit(20);

      if (filters.recordTypes.length > 0) {
        q = q.in('record_type', filters.recordTypes);
      }

      if (filters.startDate) {
        q = q.gte('indexed_at', `${filters.startDate}T00:00:00`);
      }

      if (filters.endDate) {
        q = q.lte('indexed_at', `${filters.endDate}T23:59:59`);
      }

      if (filters.tags.length > 0) {
        // Filter results by tags (client-side since Postgres array filtering can be complex)
        const { data, error } = await q;
        if (error) throw error;

        const filtered = data?.filter(entry =>
          filters.tags.some(tag => entry.tags?.includes(tag))
        ) ?? [];
        setResults(filtered);
      } else {
        const { data, error } = await q;
        if (error) throw error;
        setResults(data ?? []);
      }
    } catch (err) {
      console.error('Error searching:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [org, query, filters]);

  const toggleRecordType = (type: Exclude<RecordType, 'all'>) => {
    setFilters(prev => ({
      ...prev,
      recordTypes: prev.recordTypes.includes(type)
        ? prev.recordTypes.filter(t => t !== type)
        : [...prev.recordTypes, type],
    }));
  };

  const addTag = () => {
    if (tagInput.trim()) {
      setFilters(prev => ({
        ...prev,
        tags: [...new Set([...prev.tags, tagInput.trim()])],
      }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  const resetFilters = () => {
    setFilters({
      recordTypes: [],
      startDate: '',
      endDate: '',
      tags: [],
    });
    setQuery('');
  };

  const hasActiveFilters = filters.recordTypes.length > 0 || filters.startDate || filters.endDate || filters.tags.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Hero Header with Search Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Search Everything</h1>
          <p className="text-slate-600 mb-8">Find projects, forms, indicators, tasks, documents and more across your organization</p>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by title, content, tags..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-4 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-slate-900 placeholder-slate-500 transition"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Record Type Filter Pills */}
          <div className="mt-6 flex flex-wrap gap-2">
            {(Object.entries(RECORD_TYPE_CONFIG) as Array<[Exclude<RecordType, 'all'>, typeof RECORD_TYPE_CONFIG[Exclude<RecordType, "all">]]>).map(
              ([type, { label, icon: Icon }]) => (
                <button
                  key={type}
                  onClick={() => toggleRecordType(type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    filters.recordTypes.includes(type)
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Filters & Controls */}
        <div className="mb-8">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
              hasActiveFilters || showFilters
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Filter className="w-4 h-4" />
            Advanced Filters
            {hasActiveFilters && (
              <span className="ml-auto text-xs font-semibold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                {filters.recordTypes.length + (filters.startDate ? 1 : 0) + (filters.endDate ? 1 : 0) + filters.tags.length}
              </span>
            )}
          </button>

          {showFilters && (
            <div className="mt-4 p-4 bg-white border border-slate-200 rounded-lg space-y-4">
              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tags (comma-separated)</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Add tag and press Enter"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  />
                  <button
                    onClick={addTag}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Add
                  </button>
                </div>
                {filters.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {filters.tags.map(tag => (
                      <span
                        key={tag}
                        className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                      >
                        <Tag className="w-3.5 h-3.5" />
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="hover:text-blue-900 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results Header */}
        {query && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              {loading ? 'Searching...' : `Found ${results.length} result${results.length !== 1 ? 's' : ''}`}
            </h2>
          </div>
        )}

        {!query && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-600" />
              Recent Entries
            </h2>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="py-12 text-center">
            <div className="flex justify-center mb-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <p className="text-slate-600">Searching your organization...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && results.length === 0 && (
          <div className="py-12 text-center">
            <Search className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {query ? 'No results found' : 'Start searching to see results'}
            </h3>
            <p className="text-slate-600 max-w-sm mx-auto">
              {query
                ? `Try adjusting your search terms, filters, or date range.`
                : `Use the search bar above to find projects, forms, indicators, and more.`}
            </p>
          </div>
        )}

        {/* Results List */}
        <div className="space-y-3">
          {results.map((entry) => {
            const Icon = getIconForRecordType(entry.record_type);
            const color = getColorForRecordType(entry.record_type);

            return (
              <div
                key={entry.id}
                className="group bg-white border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition cursor-pointer"
              >
                {/* Header with Icon, Title, and Buttons */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Icon className={`${color} w-5 h-5 mt-0.5 flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 text-sm group-hover:text-blue-600 transition break-words">
                        {highlightMatches(entry.title, query)}
                      </h3>
                    </div>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 flex-shrink-0 capitalize">
                      {RECORD_TYPE_CONFIG[entry.record_type as Exclude<RecordType, 'all'>]?.label || entry.record_type}
                    </span>
                  </div>
                  <button className="flex-shrink-0 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition opacity-0 group-hover:opacity-100">
                    Open
                  </button>
                </div>

                {/* Body Snippet */}
                {entry.body && (
                  <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                    {highlightMatches(entry.body.substring(0, 150) + (entry.body.length > 150 ? '...' : ''), query)}
                  </p>
                )}

                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  {entry.category && (
                    <span className="px-2 py-1 bg-slate-50 rounded text-slate-700 font-medium">
                      {entry.category}
                    </span>
                  )}

                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex gap-1">
                      {entry.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="px-2 py-1 bg-amber-50 text-amber-700 rounded">
                          #{tag}
                        </span>
                      ))}
                      {entry.tags.length > 2 && (
                        <span className="px-2 py-1 text-slate-500">
                          +{entry.tags.length - 2} more
                        </span>
                      )}
                    </div>
                  )}

                  <div className="ml-auto flex items-center gap-1 text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(entry.indexed_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

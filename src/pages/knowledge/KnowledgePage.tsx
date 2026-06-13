import React, { useState, useEffect } from 'react';
import {
  Library,
  BookOpen,
  FileText,
  Search,
  Plus,
  RefreshCw,
  ChevronRight,
  Tag,
  Eye,
  CheckCircle2,
  Clock,
  Archive,
  Star,
  X,
  ChevronDown,
  FolderOpen,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import type { KnowledgeArticle, KnowledgeCategory, KnowledgeDocumentType } from '../../types';

export function KnowledgePage() {
  const { org } = useOrg();
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (org) {
      fetchData();
    }
  }, [org]);

  const fetchData = async () => {
    if (!org) return;
    setLoading(true);
    try {
      const [articlesData, categoriesData] = await Promise.all([
        supabase
          .from('knowledge_articles')
          .select('*')
          .eq('organization_id', org.id)
          .order('updated_at', { ascending: false }),
        supabase
          .from('knowledge_categories')
          .select('*')
          .eq('organization_id', org.id)
          .order('sort_order', { ascending: true }),
      ]);

      if (articlesData.error) throw articlesData.error;
      if (categoriesData.error) throw categoriesData.error;

      setArticles(articlesData.data || []);
      setCategories(categoriesData.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDocumentTypeColor = (type: KnowledgeDocumentType) => {
    const colors: Record<KnowledgeDocumentType, { bg: string; text: string }> = {
      manual: { bg: 'bg-blue-100', text: 'text-blue-700' },
      sop: { bg: 'bg-amber-100', text: 'text-amber-700' },
      protocol: { bg: 'bg-green-100', text: 'text-green-700' },
      policy: { bg: 'bg-red-100', text: 'text-red-700' },
      methodology: { bg: 'bg-purple-100', text: 'text-purple-700' },
      technical: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
      article: { bg: 'bg-gray-100', text: 'text-gray-700' },
      faq: { bg: 'bg-orange-100', text: 'text-orange-700' },
    };
    return colors[type];
  };

  const getLifecycleStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-emerald-100 text-emerald-700';
      case 'draft':
        return 'bg-yellow-100 text-yellow-700';
      case 'archived':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getDocumentTypeLabel = (type: KnowledgeDocumentType) => {
    const labels: Record<KnowledgeDocumentType, string> = {
      manual: 'Manual',
      sop: 'SOP',
      protocol: 'Protocol',
      policy: 'Policy',
      methodology: 'Methodology',
      technical: 'Technical',
      article: 'Article',
      faq: 'FAQ',
    };
    return labels[type];
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const updated = new Set(prev);
      if (updated.has(categoryId)) {
        updated.delete(categoryId);
      } else {
        updated.add(categoryId);
      }
      return updated;
    });
  };

  const filterArticles = () => {
    let filtered = articles;

    // Filter by tab
    if (activeTab !== 'all') {
      if (activeTab === 'published') {
        filtered = filtered.filter((a) => a.lifecycle_status === 'published');
      } else if (activeTab === 'draft') {
        filtered = filtered.filter((a) => a.lifecycle_status === 'draft');
      } else if (activeTab === 'archived') {
        filtered = filtered.filter((a) => a.lifecycle_status === 'archived');
      }
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((a) => a.category_id === selectedCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  };

  const getArticlesByCategory = (categoryId: string | null) => {
    return articles.filter((a) => a.category_id === categoryId);
  };

  const getCategoryHierarchy = () => {
    const hierarchies: Map<string | null, number> = new Map();
    categories.forEach((cat) => {
      hierarchies.set(cat.id, (getArticlesByCategory(cat.id).length || 0));
    });
    return hierarchies;
  };

  const filteredArticles = filterArticles();

  const stats = {
    total: articles.length,
    published: articles.filter((a) => a.lifecycle_status === 'published').length,
    draft: articles.filter((a) => a.lifecycle_status === 'draft').length,
    categories: categories.length,
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const truncateContent = (content: string | null, maxLength: number = 500) => {
    if (!content) return '';
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading knowledge base...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 flex">
      {/* Left Sidebar - Categories */}
      <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Library className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-gray-900">Categories</h2>
          </div>
          <button className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition">
            <Plus className="w-4 h-4" />
            New Category
          </button>
        </div>

        <nav className="p-4 space-y-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`w-full text-left px-3 py-2 rounded-lg transition flex items-center justify-between ${
              selectedCategory === null
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              All Articles
            </div>
            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
              {articles.length}
            </span>
          </button>

          {categories.map((category) => (
            <div key={category.id}>
              <button
                onClick={() => {
                  setSelectedCategory(category.id);
                  toggleCategory(category.id);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg transition flex items-center justify-between ${
                  selectedCategory === category.id
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ChevronRight
                    className={`w-4 h-4 transition-transform ${
                      expandedCategories.has(category.id) ? 'rotate-90' : ''
                    }`}
                  />
                  {category.name}
                </div>
                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                  {getArticlesByCategory(category.id).length}
                </span>
              </button>
            </div>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Knowledge Library</h1>
              <p className="text-gray-600 mt-1">Documentation and reference materials</p>
            </div>
            <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
              <Plus className="w-5 h-5" />
              New Article
            </button>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Total Articles</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Published</p>
              <p className="text-3xl font-bold text-emerald-600 mt-2">{stats.published}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Draft</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.draft}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Categories</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{stats.categories}</p>
            </div>
          </div>

          {/* Search & Tabs */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="flex gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by title or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={fetchData}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-t border-gray-200 pt-4">
              {(['all', 'published', 'draft', 'archived'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 border-b-2 transition ${
                    activeTab === tab
                      ? 'border-blue-600 text-blue-600 font-semibold'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Articles List */}
          {filteredArticles.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No articles found</p>
              <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or create a new article</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredArticles.map((article) => (
                <button
                  key={article.id}
                  onClick={() => setSelectedArticle(article)}
                  className="w-full bg-white rounded-lg border border-gray-200 hover:shadow-md transition text-left p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded ${getDocumentTypeColor(
                            article.document_type
                          )}`}
                        >
                          {getDocumentTypeLabel(article.document_type)}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded ${getLifecycleStatusColor(
                            article.lifecycle_status
                          )}`}
                        >
                          {article.lifecycle_status.charAt(0).toUpperCase() +
                            article.lifecycle_status.slice(1)}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{article.title}</h3>
                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {article.view_count} views
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDate(article.updated_at)}
                        </span>
                      </div>
                      {article.tags && article.tags.length > 0 && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {article.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {tag}
                            </span>
                          ))}
                          {article.tags.length > 3 && (
                            <span className="text-xs text-gray-500">+{article.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Side Panel */}
      {selectedArticle && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-lg overflow-y-auto z-50">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Article Details</h2>
            <button
              onClick={() => setSelectedArticle(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Type & Status Badges */}
            <div className="flex gap-2 flex-wrap">
              <span
                className={`text-xs font-semibold px-2 py-1 rounded ${getDocumentTypeColor(
                  selectedArticle.document_type
                )}`}
              >
                {getDocumentTypeLabel(selectedArticle.document_type)}
              </span>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded ${getLifecycleStatusColor(
                  selectedArticle.lifecycle_status
                )}`}
              >
                {selectedArticle.lifecycle_status.charAt(0).toUpperCase() +
                  selectedArticle.lifecycle_status.slice(1)}
              </span>
            </div>

            {/* Title */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{selectedArticle.title}</h3>
            </div>

            {/* Content Preview */}
            {selectedArticle.content && (
              <div>
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-2">
                  Content
                </p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4 border border-gray-200">
                  {truncateContent(selectedArticle.content, 500)}
                </p>
              </div>
            )}

            {/* Metadata */}
            <div className="space-y-3 border-t border-gray-200 pt-6">
              {selectedArticle.version && (
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">Version</p>
                  <p className="text-sm text-gray-900 mt-1">{selectedArticle.version}</p>
                </div>
              )}

              {selectedArticle.view_count !== undefined && (
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">Views</p>
                  <p className="text-sm text-gray-900 mt-1">{selectedArticle.view_count}</p>
                </div>
              )}

              {selectedArticle.updated_at && (
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">
                    Last Updated
                  </p>
                  <p className="text-sm text-gray-900 mt-1">{formatDate(selectedArticle.updated_at)}</p>
                </div>
              )}

              {selectedArticle.published_at && (
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">
                    Published
                  </p>
                  <p className="text-sm text-gray-900 mt-1">{formatDate(selectedArticle.published_at)}</p>
                </div>
              )}
            </div>

            {/* Tags */}
            {selectedArticle.tags && selectedArticle.tags.length > 0 && (
              <div className="border-t border-gray-200 pt-6">
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedArticle.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="border-t border-gray-200 pt-6 space-y-2">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition border border-blue-200">
                <BookOpen className="w-4 h-4" />
                View Full Article
              </button>
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition border border-gray-300">
                <Star className="w-4 h-4" />
                Edit Tags
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay when panel is open */}
      {selectedArticle && (
        <div
          onClick={() => setSelectedArticle(null)}
          className="fixed inset-0 bg-black/50 z-40"
          style={{ pointerEvents: selectedArticle ? 'auto' : 'none' }}
        />
      )}
    </div>
  );
}

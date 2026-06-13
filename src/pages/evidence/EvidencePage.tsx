import React, { useState, useEffect } from 'react';
import {
  Camera,
  Video,
  Mic,
  FileText,
  MapPin,
  PenLine,
  File,
  Plus,
  Search,
  RefreshCw,
  Filter,
  Download,
  CheckCircle2,
  Eye,
  Tag,
  X,
  Calendar,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import type { EvidenceItem, EvidenceType } from '../../types';

export function EvidencePage() {
  const { org } = useOrg();
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<EvidenceType | 'all'>('all');
  const [selectedItem, setSelectedItem] = useState<EvidenceItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (org) fetchEvidenceItems();
  }, [org]);

  const fetchEvidenceItems = async () => {
    if (!org) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('evidence_items')
        .select('*')
        .eq('organization_id', org.id)
        .order('captured_at', { ascending: false });

      if (error) throw error;
      setEvidenceItems(data || []);
    } catch (err) {
      console.error('Error fetching evidence:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: EvidenceType) => {
    switch (type) {
      case 'photo':
        return <Camera className="w-5 h-5" />;
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'audio':
        return <Mic className="w-5 h-5" />;
      case 'pdf':
        return <FileText className="w-5 h-5" />;
      case 'document':
        return <File className="w-5 h-5" />;
      case 'gps':
        return <MapPin className="w-5 h-5" />;
      case 'signature':
        return <PenLine className="w-5 h-5" />;
      default:
        return <File className="w-5 h-5" />;
    }
  };

  const getTypeBgColor = (type: EvidenceType) => {
    switch (type) {
      case 'photo':
        return 'bg-teal-50 border-teal-200';
      case 'video':
        return 'bg-purple-50 border-purple-200';
      case 'audio':
        return 'bg-orange-50 border-orange-200';
      case 'pdf':
        return 'bg-red-50 border-red-200';
      case 'document':
        return 'bg-blue-50 border-blue-200';
      case 'gps':
        return 'bg-emerald-50 border-emerald-200';
      case 'signature':
        return 'bg-indigo-50 border-indigo-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  const getTypeIconColor = (type: EvidenceType) => {
    switch (type) {
      case 'photo':
        return 'text-teal-600';
      case 'video':
        return 'text-purple-600';
      case 'audio':
        return 'text-orange-600';
      case 'pdf':
        return 'text-red-600';
      case 'document':
        return 'text-blue-600';
      case 'gps':
        return 'text-emerald-600';
      case 'signature':
        return 'text-indigo-600';
      default:
        return 'text-slate-600';
    }
  };

  const getTypeLabel = (type: EvidenceType) => {
    const labels: Record<EvidenceType, string> = {
      photo: 'Photo',
      video: 'Video',
      audio: 'Audio',
      pdf: 'PDF',
      document: 'Document',
      gps: 'GPS',
      signature: 'Signature',
      other: 'Other',
    };
    return labels[type];
  };

  const filterItems = () => {
    let filtered = evidenceItems;

    if (selectedType !== 'all') {
      filtered = filtered.filter((item) => item.evidence_type === selectedType);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  };

  const filteredItems = filterItems();

  const stats = {
    total: evidenceItems.length,
    photos: evidenceItems.filter((e) => e.evidence_type === 'photo').length,
    videos: evidenceItems.filter((e) => e.evidence_type === 'video').length,
    unverified: evidenceItems.filter((e) => !e.is_verified).length,
  };

  const handleVerify = async () => {
    if (!selectedItem) return;
    try {
      const { error } = await supabase
        .from('evidence_items')
        .update({
          is_verified: true,
          verified_by: org?.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', selectedItem.id);

      if (error) throw error;
      setSelectedItem((prev) => (prev ? { ...prev, is_verified: true } : null));
      fetchEvidenceItems();
    } catch (err) {
      console.error('Error verifying evidence:', err);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const typeFilters: Array<{ type: EvidenceType | 'all'; icon: React.ReactNode; label: string; bgColor: string }> = [
    { type: 'all', icon: <Filter className="w-4 h-4" />, label: 'All', bgColor: 'bg-slate-100 text-slate-700' },
    { type: 'photo', icon: <Camera className="w-4 h-4" />, label: 'Photos', bgColor: 'bg-teal-100 text-teal-700' },
    { type: 'video', icon: <Video className="w-4 h-4" />, label: 'Videos', bgColor: 'bg-purple-100 text-purple-700' },
    { type: 'audio', icon: <Mic className="w-4 h-4" />, label: 'Audio', bgColor: 'bg-orange-100 text-orange-700' },
    { type: 'pdf', icon: <FileText className="w-4 h-4" />, label: 'PDFs', bgColor: 'bg-red-100 text-red-700' },
    {
      type: 'document',
      icon: <File className="w-4 h-4" />,
      label: 'Documents',
      bgColor: 'bg-blue-100 text-blue-700',
    },
    { type: 'gps', icon: <MapPin className="w-4 h-4" />, label: 'GPS', bgColor: 'bg-emerald-100 text-emerald-700' },
    { type: 'signature', icon: <PenLine className="w-4 h-4" />, label: 'Signatures', bgColor: 'bg-indigo-100 text-indigo-700' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading evidence...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Evidence Management</h1>
            <p className="text-gray-600 mt-1">Track and verify all evidence items</p>
          </div>
          <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            <Plus className="w-5 h-5" />
            Add Evidence
          </button>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Total Evidence</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Photos</p>
            <p className="text-3xl font-bold text-teal-600 mt-2">{stats.photos}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Videos</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">{stats.videos}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Unverified</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">{stats.unverified}</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={fetchEvidenceItems}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {typeFilters.map((filter) => (
            <button
              key={filter.type}
              onClick={() => setSelectedType(filter.type)}
              className={`flex items-center gap-2 px-3 py-2 rounded-full whitespace-nowrap transition ${
                selectedType === filter.type
                  ? filter.bgColor
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {filter.icon}
              {filter.label}
            </button>
          ))}
        </div>

        {/* Evidence Grid */}
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No evidence items found</p>
            <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 lg:grid-cols-3 md:grid-cols-2 gap-4">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition text-left"
              >
                <div className={`h-24 flex items-center justify-center border-b ${getTypeBgColor(item.evidence_type)}`}>
                  <div className={`${getTypeIconColor(item.evidence_type)}`}>{getTypeIcon(item.evidence_type)}</div>
                </div>
                <div className="p-4">
                  <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
                  <p className="text-xs text-gray-600 mt-1">{getTypeLabel(item.evidence_type)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {item.linked_type && (
                      <span className="inline-block bg-gray-100 px-2 py-1 rounded">
                        {item.linked_type}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-2 line-clamp-1">
                    {formatDate(item.captured_at)}
                  </p>
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {item.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                      {item.tags.length > 2 && (
                        <span className="text-xs text-gray-500">+{item.tags.length - 2}</span>
                      )}
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    {item.is_verified ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle2 className="w-4 h-4" />
                        Verified
                      </span>
                    ) : (
                      <span className="text-xs text-orange-600 font-medium">Unverified</span>
                    )}
                    <Eye className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail Side Panel */}
      {selectedItem && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-lg overflow-y-auto z-50">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Evidence Details</h2>
            <button
              onClick={() => setSelectedItem(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Type & Header */}
            <div>
              <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${getTypeBgColor(selectedItem.evidence_type)}`}>
                <div className={getTypeIconColor(selectedItem.evidence_type)}>
                  {getTypeIcon(selectedItem.evidence_type)}
                </div>
                <span className="font-medium">{getTypeLabel(selectedItem.evidence_type)}</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mt-4">{selectedItem.name}</h3>
              {selectedItem.description && (
                <p className="text-gray-600 text-sm mt-2">{selectedItem.description}</p>
              )}
            </div>

            {/* Metadata */}
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">Captured At</p>
                <p className="text-sm text-gray-900 mt-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  {formatDate(selectedItem.captured_at)}
                </p>
              </div>

              {selectedItem.linked_type && (
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">Linked To</p>
                  <p className="text-sm text-gray-900 mt-1 bg-blue-50 px-3 py-2 rounded border border-blue-200">
                    {selectedItem.linked_type}
                  </p>
                </div>
              )}

              {selectedItem.file_size_bytes !== null && (
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">File Size</p>
                  <p className="text-sm text-gray-900 mt-1">{formatFileSize(selectedItem.file_size_bytes)}</p>
                </div>
              )}

              {selectedItem.mime_type && (
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">MIME Type</p>
                  <p className="text-sm text-gray-900 mt-1 font-mono text-xs bg-gray-100 px-3 py-2 rounded">
                    {selectedItem.mime_type}
                  </p>
                </div>
              )}

              {selectedItem.duration_sec !== null && (
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">Duration</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {Math.floor(selectedItem.duration_sec / 60)}m {selectedItem.duration_sec % 60}s
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">Version</p>
                <p className="text-sm text-gray-900 mt-1">{selectedItem.version}</p>
              </div>
            </div>

            {/* GPS Data */}
            {selectedItem.gps_lat !== null && selectedItem.gps_lng !== null && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  GPS Coordinates
                </p>
                <div className="mt-3 space-y-2 text-sm text-gray-900">
                  <p>
                    <span className="text-gray-600">Latitude:</span> {selectedItem.gps_lat.toFixed(6)}
                  </p>
                  <p>
                    <span className="text-gray-600">Longitude:</span> {selectedItem.gps_lng.toFixed(6)}
                  </p>
                  {selectedItem.gps_accuracy !== null && (
                    <p>
                      <span className="text-gray-600">Accuracy:</span> ±{selectedItem.gps_accuracy.toFixed(1)}m
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Tags */}
            {selectedItem.tags && selectedItem.tags.length > 0 && (
              <div>
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Verification Status */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Verification Status</p>
                  {selectedItem.is_verified ? (
                    <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Verified
                    </p>
                  ) : (
                    <p className="text-xs text-orange-600 mt-1">Not verified</p>
                  )}
                </div>
                {!selectedItem.is_verified && (
                  <button
                    onClick={handleVerify}
                    className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 transition"
                  >
                    Verify
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-gray-200 pt-6 space-y-2">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition border border-blue-200">
                <Eye className="w-4 h-4" />
                View Full
              </button>
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition border border-gray-300">
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay when panel is open */}
      {selectedItem && (
        <div
          onClick={() => setSelectedItem(null)}
          className="fixed inset-0 bg-black/50 z-40 pointer-events-none"
          style={{ pointerEvents: selectedItem ? 'auto' : 'none' }}
        />
      )}
    </div>
  );
}

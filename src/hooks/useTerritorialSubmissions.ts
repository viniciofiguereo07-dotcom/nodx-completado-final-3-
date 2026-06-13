import { useEffect, useState, useCallback } from 'react';
import { useOrg } from '../contexts/OrgContext';
import { useAuth } from '../contexts/AuthContext';
import { territorialFieldCollectionEngine } from '../services/TerritorialFieldCollectionEngine';
import type {
  TerritorialSubmission,
  TerritorialPhoto,
  TerritorialSignature,
} from '../services/TerritorialFieldCollectionEngine';

// ---------------------------------------------------------------------------
// useTerritorialSubmissions — submission list with filters
// ---------------------------------------------------------------------------
export function useTerritorialSubmissions(opts?: {
  formId?: string;
  entityId?: string;
  status?: string;
  limit?: number;
}) {
  const { org } = useOrg();
  const [submissions, setSubmissions] = useState<TerritorialSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setSubmissions(await territorialFieldCollectionEngine.getSubmissions(org.id, opts));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [org, opts?.formId, opts?.entityId, opts?.status, opts?.limit]);

  useEffect(() => { load(); }, [load]);

  const createSubmission = useCallback(async (input: {
    formId: string;
    entityId?: string;
    entityType?: string;
    data?: Record<string, unknown>;
  }) => {
    if (!org) throw new Error('No organization');
    const submission = await territorialFieldCollectionEngine.createSubmission({
      organizationId: org.id,
      ...input,
    });
    setSubmissions(prev => [submission, ...prev]);
    return submission;
  }, [org]);

  return { submissions, loading, error, reload: load, createSubmission };
}

// ---------------------------------------------------------------------------
// useTerritorialSubmission — single submission with photos/signatures
// ---------------------------------------------------------------------------
export function useTerritorialSubmission(submissionId: string | null) {
  const { user } = useAuth();
  const [submission, setSubmission] = useState<TerritorialSubmission | null>(null);
  const [photos, setPhotos] = useState<TerritorialPhoto[]>([]);
  const [signatures, setSignatures] = useState<TerritorialSignature[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!submissionId) {
      setSubmission(null);
      setPhotos([]);
      setSignatures([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await territorialFieldCollectionEngine.getSubmission(submissionId);
      setSubmission(data);
      setPhotos((data?.photos as TerritorialPhoto[]) ?? []);
      setSignatures((data?.signatures as TerritorialSignature[]) ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => { load(); }, [load]);

  const updateSubmission = useCallback(async (patch: {
    data?: Record<string, unknown>;
    gps_latitude?: number;
    gps_longitude?: number;
    gps_accuracy?: number;
    status?: 'draft' | 'submitted' | 'reviewed' | 'rejected';
  }) => {
    if (!submissionId) throw new Error('No submission ID');
    const updated = await territorialFieldCollectionEngine.updateSubmission(submissionId, patch);
    setSubmission(updated);
    return updated;
  }, [submissionId]);

  const submitSubmission = useCallback(async (gps?: { lat: number; lng: number; accuracy?: number }) => {
    if (!submissionId) throw new Error('No submission ID');
    if (!user) throw new Error('No user');
    const updated = await territorialFieldCollectionEngine.submitSubmission(submissionId, user.id, gps);
    setSubmission(updated);
    return updated;
  }, [submissionId, user]);

  const addPhoto = useCallback(async (input: {
    fileUrl: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    gpsLatitude?: number;
    gpsLongitude?: number;
    gpsAccuracy?: number;
    caption?: string;
    metadata?: Record<string, unknown>;
    takenAt?: string;
  }) => {
    if (!submissionId) throw new Error('No submission ID');
    const photo = await territorialFieldCollectionEngine.addPhoto({
      submissionId,
      organizationId: submission?.organization_id ?? '',
      ...input,
    });
    setPhotos(prev => [...prev, photo]);
    return photo;
  }, [submissionId, submission?.organization_id]);

  const deletePhoto = useCallback(async (photoId: string) => {
    await territorialFieldCollectionEngine.deletePhoto(photoId);
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  }, []);

  const addSignature = useCallback(async (input: {
    signerName: string;
    signerRole?: string;
    signatureData: string;
    documentType?: string;
    ipAddress?: string;
  }) => {
    if (!submissionId) throw new Error('No submission ID');
    const signature = await territorialFieldCollectionEngine.addSignature({
      submissionId,
      organizationId: submission?.organization_id ?? '',
      ...input,
    });
    setSignatures(prev => [...prev, signature]);
    return signature;
  }, [submissionId, submission?.organization_id]);

  const deleteSignature = useCallback(async (signatureId: string) => {
    await territorialFieldCollectionEngine.deleteSignature(signatureId);
    setSignatures(prev => prev.filter(s => s.id !== signatureId));
  }, []);

  const deleteSubmission = useCallback(async () => {
    if (!submissionId) throw new Error('No submission ID');
    await territorialFieldCollectionEngine.deleteSubmission(submissionId);
    setSubmission(null);
    setPhotos([]);
    setSignatures([]);
  }, [submissionId]);

  return {
    submission,
    photos,
    signatures,
    loading,
    error,
    reload: load,
    updateSubmission,
    submitSubmission,
    addPhoto,
    deletePhoto,
    addSignature,
    deleteSignature,
    deleteSubmission,
  };
}

// ---------------------------------------------------------------------------
// useTerritorialSubmissionStats — dashboard statistics
// ---------------------------------------------------------------------------
export function useTerritorialSubmissionStats() {
  const { org } = useOrg();
  const [stats, setStats] = useState<{
    total: number;
    byStatus: Record<string, number>;
    thisMonth: number;
    withPhotos: number;
    withSignatures: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setStats(await territorialFieldCollectionEngine.getSubmissionStats(org.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [org]);

  useEffect(() => { load(); }, [load]);

  return { stats, loading, error, reload: load };
}

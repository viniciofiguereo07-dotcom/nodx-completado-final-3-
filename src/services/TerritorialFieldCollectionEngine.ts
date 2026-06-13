import { supabase } from '../lib/supabase';
import type { FormSchema } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface TerritorialForm {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  version: number;
  schema: FormSchema;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface TerritorialSubmission {
  id: string;
  organization_id: string;
  form_id: string;
  entity_id: string | null;
  entity_type: string | null;
  status: 'draft' | 'submitted' | 'reviewed' | 'rejected';
  data: Record<string, unknown>;
  gps_latitude: number | null;
  gps_longitude: number | null;
  gps_accuracy: number | null;
  submitted_at: string | null;
  submitted_by: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  form?: TerritorialForm;
  photos?: TerritorialPhoto[];
  signatures?: TerritorialSignature[];
}

export interface TerritorialPhoto {
  id: string;
  organization_id: string;
  submission_id: string;
  file_url: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  gps_accuracy: number | null;
  caption: string | null;
  metadata: Record<string, unknown>;
  taken_at: string | null;
  created_at: string;
  created_by: string | null;
}

export interface TerritorialSignature {
  id: string;
  organization_id: string;
  submission_id: string;
  signer_name: string;
  signer_role: string | null;
  signature_data: string;
  document_type: string | null;
  signed_at: string;
  created_at: string;
  created_by: string | null;
  ip_address: string | null;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------
export interface CreateFormInput {
  organizationId: string;
  name: string;
  description?: string;
  schema: FormSchema;
  createdBy?: string;
}

export interface UpdateFormInput {
  name?: string;
  description?: string | null;
  schema?: FormSchema;
  is_active?: boolean;
}

export interface CreateSubmissionInput {
  organizationId: string;
  formId: string;
  entityId?: string;
  entityType?: string;
  data?: Record<string, unknown>;
  createdBy?: string;
}

export interface UpdateSubmissionInput {
  data?: Record<string, unknown>;
  gps_latitude?: number;
  gps_longitude?: number;
  gps_accuracy?: number;
  status?: 'draft' | 'submitted' | 'reviewed' | 'rejected';
}

export interface AddPhotoInput {
  organizationId: string;
  submissionId: string;
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
  createdBy?: string;
}

export interface AddSignatureInput {
  organizationId: string;
  submissionId: string;
  signerName: string;
  signerRole?: string;
  signatureData: string;
  documentType?: string;
  createdBy?: string;
  ipAddress?: string;
}

// ---------------------------------------------------------------------------
// Main service
// ---------------------------------------------------------------------------
export class TerritorialFieldCollectionEngine {

  // -------------------------------------------------------------------------
  // Forms CRUD
  // -------------------------------------------------------------------------
  async createForm(input: CreateFormInput): Promise<TerritorialForm> {
    const { data, error } = await supabase
      .from('territorial_forms')
      .insert({
        organization_id: input.organizationId,
        name: input.name,
        description: input.description ?? null,
        version: 1,
        schema: input.schema,
        is_active: true,
        created_by: input.createdBy ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as TerritorialForm;
  }

  async getForm(id: string): Promise<TerritorialForm | null> {
    const { data, error } = await supabase
      .from('territorial_forms')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as TerritorialForm | null;
  }

  async getForms(organizationId: string, opts?: {
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<TerritorialForm[]> {
    let query = supabase
      .from('territorial_forms')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (opts?.isActive !== undefined) query = query.eq('is_active', opts.isActive);
    if (opts?.limit) query = query.limit(opts.limit);
    else query = query.limit(100);
    if (opts?.offset) query = query.range(opts.offset, opts.offset + (opts.limit ?? 100) - 1);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as TerritorialForm[];
  }

  async updateForm(id: string, patch: UpdateFormInput, incrementVersion = false): Promise<TerritorialForm> {
    const updateData: Record<string, unknown> = { ...patch };

    if (incrementVersion) {
      const { data: current } = await supabase
        .from('territorial_forms')
        .select('version')
        .eq('id', id)
        .single();
      if (current) {
        updateData.version = (current as { version: number }).version + 1;
      }
    }

    const { data, error } = await supabase
      .from('territorial_forms')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as TerritorialForm;
  }

  async deleteForm(id: string): Promise<void> {
    const { error } = await supabase
      .from('territorial_forms')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // -------------------------------------------------------------------------
  // Submissions CRUD
  // -------------------------------------------------------------------------
  async createSubmission(input: CreateSubmissionInput): Promise<TerritorialSubmission> {
    const { data, error } = await supabase
      .from('territorial_submissions')
      .insert({
        organization_id: input.organizationId,
        form_id: input.formId,
        entity_id: input.entityId ?? null,
        entity_type: input.entityType ?? null,
        status: 'draft',
        data: input.data ?? {},
        created_by: input.createdBy ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as TerritorialSubmission;
  }

  async getSubmission(id: string): Promise<TerritorialSubmission | null> {
    const { data, error } = await supabase
      .from('territorial_submissions')
      .select(`
        *,
        form:territorial_forms(*),
        photos:territorial_photos(*),
        signatures:territorial_signatures(*)
      `)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as TerritorialSubmission | null;
  }

  async getSubmissions(organizationId: string, opts?: {
    formId?: string;
    entityId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<TerritorialSubmission[]> {
    let query = supabase
      .from('territorial_submissions')
      .select('*, form:territorial_forms(id, name, version)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (opts?.formId) query = query.eq('form_id', opts.formId);
    if (opts?.entityId) query = query.eq('entity_id', opts.entityId);
    if (opts?.status) query = query.eq('status', opts.status);
    if (opts?.limit) query = query.limit(opts.limit);
    else query = query.limit(100);
    if (opts?.offset) query = query.range(opts.offset, opts.offset + (opts.limit ?? 100) - 1);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as TerritorialSubmission[];
  }

  async updateSubmission(id: string, patch: UpdateSubmissionInput): Promise<TerritorialSubmission> {
    const { data, error } = await supabase
      .from('territorial_submissions')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as TerritorialSubmission;
  }

  async submitSubmission(id: string, submittedBy: string, gps?: { lat: number; lng: number; accuracy?: number }): Promise<TerritorialSubmission> {
    const updateData: Record<string, unknown> = {
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      submitted_by: submittedBy,
    };
    if (gps) {
      updateData.gps_latitude = gps.lat;
      updateData.gps_longitude = gps.lng;
      updateData.gps_accuracy = gps.accuracy ?? null;
    }

    const { data, error } = await supabase
      .from('territorial_submissions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as TerritorialSubmission;
  }

  async deleteSubmission(id: string): Promise<void> {
    const { error } = await supabase
      .from('territorial_submissions')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // -------------------------------------------------------------------------
  // Photos
  // -------------------------------------------------------------------------
  async addPhoto(input: AddPhotoInput): Promise<TerritorialPhoto> {
    const { data, error } = await supabase
      .from('territorial_photos')
      .insert({
        organization_id: input.organizationId,
        submission_id: input.submissionId,
        file_url: input.fileUrl,
        file_name: input.fileName ?? null,
        file_size: input.fileSize ?? null,
        mime_type: input.mimeType ?? null,
        gps_latitude: input.gpsLatitude ?? null,
        gps_longitude: input.gpsLongitude ?? null,
        gps_accuracy: input.gpsAccuracy ?? null,
        caption: input.caption ?? null,
        metadata: input.metadata ?? {},
        taken_at: input.takenAt ?? null,
        created_by: input.createdBy ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as TerritorialPhoto;
  }

  async getPhotos(submissionId: string): Promise<TerritorialPhoto[]> {
    const { data, error } = await supabase
      .from('territorial_photos')
      .select('*')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as TerritorialPhoto[];
  }

  async deletePhoto(id: string): Promise<void> {
    const { error } = await supabase
      .from('territorial_photos')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // -------------------------------------------------------------------------
  // Signatures
  // -------------------------------------------------------------------------
  async addSignature(input: AddSignatureInput): Promise<TerritorialSignature> {
    const { data, error } = await supabase
      .from('territorial_signatures')
      .insert({
        organization_id: input.organizationId,
        submission_id: input.submissionId,
        signer_name: input.signerName,
        signer_role: input.signerRole ?? null,
        signature_data: input.signatureData,
        document_type: input.documentType ?? null,
        created_by: input.createdBy ?? null,
        ip_address: input.ipAddress ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as TerritorialSignature;
  }

  async getSignatures(submissionId: string): Promise<TerritorialSignature[]> {
    const { data, error } = await supabase
      .from('territorial_signatures')
      .select('*')
      .eq('submission_id', submissionId)
      .order('signed_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as TerritorialSignature[];
  }

  async deleteSignature(id: string): Promise<void> {
    const { error } = await supabase
      .from('territorial_signatures')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // -------------------------------------------------------------------------
  // Statistics
  // -------------------------------------------------------------------------
  async getSubmissionStats(organizationId: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    thisMonth: number;
    withPhotos: number;
    withSignatures: number;
  }> {
    const { data: submissions, error } = await supabase
      .from('territorial_submissions')
      .select('status, created_at')
      .eq('organization_id', organizationId);

    if (error) throw error;

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let thisMonth = 0;
    const byStatus: Record<string, number> = { draft: 0, submitted: 0, reviewed: 0, rejected: 0 };

    for (const s of submissions ?? []) {
      const sub = s as { status: string; created_at: string };
      byStatus[sub.status] = (byStatus[sub.status] || 0) + 1;
      if (new Date(sub.created_at) >= thisMonthStart) thisMonth++;
    }

    const { count: withPhotos } = await supabase
      .from('territorial_photos')
      .select('submission_id', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    const { count: withSignatures } = await supabase
      .from('territorial_signatures')
      .select('submission_id', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    return {
      total: submissions?.length ?? 0,
      byStatus,
      thisMonth,
      withPhotos: withPhotos ?? 0,
      withSignatures: withSignatures ?? 0,
    };
  }
}

export const territorialFieldCollectionEngine = new TerritorialFieldCollectionEngine();

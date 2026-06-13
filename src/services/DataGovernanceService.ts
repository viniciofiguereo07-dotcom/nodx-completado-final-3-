import { supabase } from '../lib/supabase';
import type { DataPolicy, RetentionPolicy, ArchiveJob, DataExportRequest } from '../types';

export class DataGovernanceService {
  async getPolicies(organizationId: string): Promise<DataPolicy[]> {
    const { data, error } = await supabase
      .from('data_policies')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async createPolicy(policy: Omit<DataPolicy, 'id' | 'created_at' | 'updated_at'>): Promise<DataPolicy> {
    const { data, error } = await supabase
      .from('data_policies')
      .insert(policy)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updatePolicy(id: string, patch: Partial<DataPolicy>): Promise<void> {
    const { error } = await supabase
      .from('data_policies')
      .update(patch)
      .eq('id', id);
    if (error) throw error;
  }

  async deletePolicy(id: string): Promise<void> {
    const { error } = await supabase
      .from('data_policies')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async getRetentionPolicies(organizationId: string): Promise<RetentionPolicy[]> {
    const { data, error } = await supabase
      .from('retention_policies')
      .select('*')
      .eq('organization_id', organizationId)
      .order('table_name');
    if (error) throw error;
    return data ?? [];
  }

  async upsertRetentionPolicy(policy: Omit<RetentionPolicy, 'id' | 'created_at' | 'updated_at'>): Promise<RetentionPolicy> {
    const { data, error } = await supabase
      .from('retention_policies')
      .upsert(policy, { onConflict: 'organization_id,table_name' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getArchiveJobs(organizationId: string): Promise<ArchiveJob[]> {
    const { data, error } = await supabase
      .from('archive_jobs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  }

  async triggerArchiveJob(
    organizationId: string,
    tableName: string,
    policyId: string | null,
    triggeredBy: string
  ): Promise<ArchiveJob> {
    const { data, error } = await supabase
      .from('archive_jobs')
      .insert({
        organization_id: organizationId,
        policy_id: policyId,
        table_name: tableName,
        status: 'pending',
        triggered_by: triggeredBy,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async requestExport(request: Omit<DataExportRequest, 'id' | 'status' | 'file_url' | 'expires_at' | 'record_count' | 'created_at' | 'completed_at'>): Promise<DataExportRequest> {
    const { data, error } = await supabase
      .from('data_export_requests')
      .insert({ ...request, status: 'pending' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getExportRequests(organizationId: string): Promise<DataExportRequest[]> {
    const { data, error } = await supabase
      .from('data_export_requests')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return data ?? [];
  }
}

export const governanceService = new DataGovernanceService();

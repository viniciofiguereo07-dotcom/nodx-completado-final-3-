import { supabase } from '../lib/supabase';
import type {
  TerritorialEntity,
  TerritorialOwner,
  TerritorialLocation,
  TerritorialClassification,
  TerritorialOperation,
  TerritorialAssignment,
  TerritorialPotentialScore,
  TerritorialBusinessType,
  TerritorialSize,
  TerritorialPotential,
  TerritorialOperationType,
  TerritorialOperationRole,
} from '../types';

// ---------------------------------------------------------------------------
// Duplicate detection result
// ---------------------------------------------------------------------------
export interface DuplicateCandidate {
  existing_id: string;
  existing_nodx_uid: string;
  existing_business_name: string;
  match_field: string;
  similarity: number;
}

// ---------------------------------------------------------------------------
// Potential computation result
// ---------------------------------------------------------------------------
export interface PotentialComputation {
  entity_id: string;
  potential_score: number;
  confidence_score: number;
  factors: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Main service
// ---------------------------------------------------------------------------
export class TerritorialMasterRegistryEngine {

  // -----------------------------------------------------------------------
  // Entity CRUD
  // -----------------------------------------------------------------------
  async createEntity(input: {
    organizationId: string;
    nodxUid: string;
    businessName: string;
    commercialName?: string;
    legalName?: string;
    createdBy?: string;
  }): Promise<TerritorialEntity> {
    const { data, error } = await supabase
      .from('territorial_entities')
      .insert({
        organization_id: input.organizationId,
        nodx_uid: input.nodxUid,
        business_name: input.businessName,
        commercial_name: input.commercialName ?? null,
        legal_name: input.legalName ?? null,
        is_active: true,
        created_by: input.createdBy ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as TerritorialEntity;
  }

  async updateEntity(id: string, patch: Partial<Pick<TerritorialEntity, 'business_name' | 'commercial_name' | 'legal_name' | 'is_active'>>): Promise<void> {
    const { error } = await supabase
      .from('territorial_entities')
      .update(patch)
      .eq('id', id);
    if (error) throw error;
  }

  async getEntity(id: string): Promise<TerritorialEntity | null> {
    const { data, error } = await supabase
      .from('territorial_entities')
      .select('*, owner:territorial_owners(*), location:territorial_locations(*), classification:territorial_classifications(*), potential_score:territorial_potential_scores(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as TerritorialEntity | null;
  }

  async getEntities(organizationId: string, opts?: {
    isActive?: boolean;
    businessType?: TerritorialBusinessType;
    limit?: number;
    offset?: number;
  }): Promise<TerritorialEntity[]> {
    let query = supabase
      .from('territorial_entities')
      .select('*, classification:territorial_classifications(business_type, size, potential), location:territorial_locations(province, municipality, district)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (opts?.isActive !== undefined) query = query.eq('is_active', opts.isActive);
    if (opts?.limit) query = query.limit(opts.limit);
    else query = query.limit(200);
    if (opts?.offset) query = query.range(opts.offset, opts.offset + (opts.limit ?? 200) - 1);

    const { data, error } = await query;
    if (error) throw error;

    if (opts?.businessType) {
      return (data ?? []).filter(e =>
        (e as Record<string, unknown>).classification &&
        ((e as Record<string, unknown>).classification as Record<string, unknown>)?.business_type === opts.businessType
      ) as TerritorialEntity[];
    }

    return (data ?? []) as TerritorialEntity[];
  }

  // -----------------------------------------------------------------------
  // Owner CRUD
  // -----------------------------------------------------------------------
  async upsertOwner(input: {
    organizationId: string;
    entityId: string;
    name: string;
    knownName?: string;
    phone?: string;
    mobile?: string;
    whatsapp?: string;
    email?: string;
  }): Promise<TerritorialOwner> {
    const { data, error } = await supabase
      .from('territorial_owners')
      .upsert({
        organization_id: input.organizationId,
        entity_id: input.entityId,
        name: input.name,
        known_name: input.knownName ?? null,
        phone: input.phone ?? null,
        mobile: input.mobile ?? null,
        whatsapp: input.whatsapp ?? null,
        email: input.email ?? null,
      }, { onConflict: 'entity_id' })
      .select()
      .single();
    if (error) throw error;
    return data as TerritorialOwner;
  }

  // -----------------------------------------------------------------------
  // Location CRUD
  // -----------------------------------------------------------------------
  async upsertLocation(input: {
    organizationId: string;
    entityId: string;
    country?: string;
    province?: string;
    municipality?: string;
    district?: string;
    sector?: string;
    neighborhood?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<TerritorialLocation> {
    const { data, error } = await supabase
      .from('territorial_locations')
      .upsert({
        organization_id: input.organizationId,
        entity_id: input.entityId,
        country: input.country ?? null,
        province: input.province ?? null,
        municipality: input.municipality ?? null,
        district: input.district ?? null,
        sector: input.sector ?? null,
        neighborhood: input.neighborhood ?? null,
        address: input.address ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      }, { onConflict: 'entity_id' })
      .select()
      .single();
    if (error) throw error;
    return data as TerritorialLocation;
  }

  // -----------------------------------------------------------------------
  // Classification CRUD
  // -----------------------------------------------------------------------
  async upsertClassification(input: {
    organizationId: string;
    entityId: string;
    businessType?: TerritorialBusinessType;
    size?: TerritorialSize;
    potential?: TerritorialPotential;
  }): Promise<TerritorialClassification> {
    const { data, error } = await supabase
      .from('territorial_classifications')
      .upsert({
        organization_id: input.organizationId,
        entity_id: input.entityId,
        business_type: input.businessType ?? null,
        size: input.size ?? null,
        potential: input.potential ?? null,
      }, { onConflict: 'entity_id' })
      .select()
      .single();
    if (error) throw error;
    return data as TerritorialClassification;
  }

  // -----------------------------------------------------------------------
  // Operations CRUD
  // -----------------------------------------------------------------------
  async addOperation(input: {
    organizationId: string;
    entityId: string;
    operationType: TerritorialOperationType;
    operationRole: TerritorialOperationRole;
  }): Promise<TerritorialOperation> {
    const { data, error } = await supabase
      .from('territorial_operations')
      .insert({
        organization_id: input.organizationId,
        entity_id: input.entityId,
        operation_type: input.operationType,
        operation_role: input.operationRole,
        is_active: true,
      })
      .select()
      .single();
    if (error) throw error;
    return data as TerritorialOperation;
  }

  async getOperations(entityId: string): Promise<TerritorialOperation[]> {
    const { data, error } = await supabase
      .from('territorial_operations')
      .select('*')
      .eq('entity_id', entityId)
      .eq('is_active', true);
    if (error) throw error;
    return (data ?? []) as TerritorialOperation[];
  }

  // -----------------------------------------------------------------------
  // Assignments CRUD
  // -----------------------------------------------------------------------
  async createAssignment(input: {
    organizationId: string;
    entityId: string;
    userId?: string;
    routeId?: string;
    corridorId?: string;
    assignedBy?: string;
  }): Promise<TerritorialAssignment> {
    const { data, error } = await supabase
      .from('territorial_assignments')
      .insert({
        organization_id: input.organizationId,
        entity_id: input.entityId,
        user_id: input.userId ?? null,
        route_id: input.routeId ?? null,
        corridor_id: input.corridorId ?? null,
        is_active: true,
        assigned_by: input.assignedBy ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as TerritorialAssignment;
  }

  // -----------------------------------------------------------------------
  // Duplicate detection
  // -----------------------------------------------------------------------
  async detectDuplicates(organizationId: string, candidate: {
    businessName?: string;
    commercialName?: string;
    phone?: string;
    email?: string;
  }): Promise<DuplicateCandidate[]> {
    const candidates: DuplicateCandidate[] = [];

    if (candidate.businessName) {
      const { data } = await supabase
        .from('territorial_entities')
        .select('id, nodx_uid, business_name')
        .eq('organization_id', organizationId)
        .ilike('business_name', `%${candidate.businessName}%`)
        .limit(10);
      for (const row of data ?? []) {
        candidates.push({
          existing_id: row.id,
          existing_nodx_uid: row.nodx_uid,
          existing_business_name: row.business_name,
          match_field: 'business_name',
          similarity: this.stringSimilarity(candidate.businessName.toLowerCase(), row.business_name.toLowerCase()),
        });
      }
    }

    if (candidate.commercialName) {
      const { data } = await supabase
        .from('territorial_entities')
        .select('id, nodx_uid, business_name')
        .eq('organization_id', organizationId)
        .ilike('commercial_name', `%${candidate.commercialName}%`)
        .limit(10);
      for (const row of data ?? []) {
        candidates.push({
          existing_id: row.id,
          existing_nodx_uid: row.nodx_uid,
          existing_business_name: row.business_name,
          match_field: 'commercial_name',
          similarity: this.stringSimilarity(candidate.commercialName.toLowerCase(), (row as Record<string, unknown>).commercial_name as string),
        });
      }
    }

    if (candidate.phone) {
      const { data } = await supabase
        .from('territorial_owners')
        .select('entity_id, entities:territorial_entities(id, nodx_uid, business_name)')
        .eq('organization_id', organizationId)
        .or(`phone.eq.${candidate.phone},mobile.eq.${candidate.phone},whatsapp.eq.${candidate.phone}`)
        .limit(10);
      for (const row of data ?? []) {
        const entity = (row as Record<string, unknown>).entities as Record<string, unknown> | null;
        if (entity) {
          candidates.push({
            existing_id: entity.id as string,
            existing_nodx_uid: entity.nodx_uid as string,
            existing_business_name: entity.business_name as string,
            match_field: 'phone',
            similarity: 1.0,
          });
        }
      }
    }

    if (candidate.email) {
      const { data } = await supabase
        .from('territorial_owners')
        .select('entity_id, entities:territorial_entities(id, nodx_uid, business_name)')
        .eq('organization_id', organizationId)
        .eq('email', candidate.email)
        .limit(10);
      for (const row of data ?? []) {
        const entity = (row as Record<string, unknown>).entities as Record<string, unknown> | null;
        if (entity) {
          candidates.push({
            existing_id: entity.id as string,
            existing_nodx_uid: entity.nodx_uid as string,
            existing_business_name: entity.business_name as string,
            match_field: 'email',
            similarity: 1.0,
          });
        }
      }
    }

    const highConfidence = candidates
      .filter(c => c.similarity >= 0.7)
      .sort((a, b) => b.similarity - a.similarity);

    const seen = new Set<string>();
    return highConfidence.filter(c => {
      const key = `${c.existing_id}|${c.match_field}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // -----------------------------------------------------------------------
  // Potential computation
  // -----------------------------------------------------------------------
  async computePotential(entityId: string): Promise<PotentialComputation> {
    const { data: entity, error } = await supabase
      .from('territorial_entities')
      .select('*, classification:territorial_classifications(*), location:territorial_locations(*)')
      .eq('id', entityId)
      .single();
    if (error) throw error;

    const factors: Record<string, number> = {};
    let score = 0;
    let confidence = 0;

    const classification = (entity as Record<string, unknown>).classification as Record<string, unknown> | null;
    if (classification) {
      const sizeScores: Record<string, number> = { micro: 0.2, small: 0.4, medium: 0.7, large: 1.0 };
      const size = classification.size as string | null;
      if (size && size in sizeScores) {
        factors.size = sizeScores[size];
        score += factors.size * 0.3;
        confidence += 0.3;
      }

      const potentialScores: Record<string, number> = { low: 0.3, medium: 0.6, high: 1.0 };
      const potential = classification.potential as string | null;
      if (potential && potential in potentialScores) {
        factors.potential = potentialScores[potential];
        score += factors.potential * 0.4;
        confidence += 0.4;
      }

      const typeScores: Record<string, number> = {
        supermarket: 1.0, minimarket: 0.8, pharmacy: 0.8, hardware_store: 0.7,
        agro_store: 0.6, restaurant: 0.6, cafeteria: 0.5, colmado: 0.4,
        beauty_salon: 0.3, other: 0.5,
      };
      const bType = classification.business_type as string | null;
      if (bType && bType in typeScores) {
        factors.business_type = typeScores[bType];
        score += factors.business_type * 0.2;
        confidence += 0.2;
      }
    }

    const location = (entity as Record<string, unknown>).location as Record<string, unknown> | null;
    if (location && location.latitude != null && location.longitude != null) {
      factors.geolocation = 0.5;
      score += 0.1;
      confidence += 0.1;
    }

    const potentialScore = Math.round(score * 100) / 100;
    const confidenceScore = Math.min(1, Math.round(confidence * 100) / 100);

    const { error: upsertError } = await supabase
      .from('territorial_potential_scores')
      .upsert({
        organization_id: entity.organization_id,
        entity_id: entityId,
        potential_score: potentialScore,
        confidence_score: confidenceScore,
        last_calculated_at: new Date().toISOString(),
      }, { onConflict: 'entity_id' });
    if (upsertError) throw upsertError;

    return { entity_id: entityId, potential_score: potentialScore, confidence_score: confidenceScore, factors };
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------
  private stringSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) matches++;
    }
    return matches / longer.length;
  }
}

export const territorialMasterRegistryEngine = new TerritorialMasterRegistryEngine();

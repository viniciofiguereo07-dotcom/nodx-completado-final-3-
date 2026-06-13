import { useEffect, useState, useCallback } from 'react';
import { useOrg } from '../contexts/OrgContext';
import { territorialMasterRegistryEngine } from '../services/TerritorialMasterRegistryEngine';
import type {
  TerritorialEntity,
  TerritorialOwner,
  TerritorialLocation,
  TerritorialClassification,
  TerritorialOperation,
  TerritorialAssignment,
  TerritorialPotentialScore,
  TerritorialBusinessType,
} from '../types';
import type { DuplicateCandidate, PotentialComputation } from '../services/TerritorialMasterRegistryEngine';

// ---------------------------------------------------------------------------
// useTerritorialRegistry — entity list with filters
// ---------------------------------------------------------------------------
export function useTerritorialRegistry(opts?: {
  isActive?: boolean;
  businessType?: TerritorialBusinessType;
  limit?: number;
}) {
  const { org } = useOrg();
  const [entities, setEntities] = useState<TerritorialEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setEntities(await territorialMasterRegistryEngine.getEntities(org.id, opts));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [org, opts?.isActive, opts?.businessType, opts?.limit]);

  useEffect(() => { load(); }, [load]);

  return { entities, loading, error, reload: load };
}

// ---------------------------------------------------------------------------
// useTerritorialEntity — single entity with full detail
// ---------------------------------------------------------------------------
export function useTerritorialEntity(entityId: string | null) {
  const [entity, setEntity] = useState<TerritorialEntity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entityId) { setEntity(null); return; }
    setLoading(true);
    setError(null);
    territorialMasterRegistryEngine.getEntity(entityId)
      .then(setEntity)
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [entityId]);

  const createEntity = useCallback(async (input: Parameters<typeof territorialMasterRegistryEngine.createEntity>[0]) => {
    const created = await territorialMasterRegistryEngine.createEntity(input);
    setEntity(created);
    return created;
  }, []);

  const updateEntity = useCallback(async (id: string, patch: Parameters<typeof territorialMasterRegistryEngine.updateEntity>[1]) => {
    await territorialMasterRegistryEngine.updateEntity(id, patch);
    setEntity(prev => prev ? { ...prev, ...patch } : prev);
  }, []);

  const upsertOwner = useCallback(async (input: Parameters<typeof territorialMasterRegistryEngine.upsertOwner>[0]) => {
    const owner = await territorialMasterRegistryEngine.upsertOwner(input);
    setEntity(prev => prev ? { ...prev, owner } : prev);
    return owner;
  }, []);

  const upsertLocation = useCallback(async (input: Parameters<typeof territorialMasterRegistryEngine.upsertLocation>[0]) => {
    const location = await territorialMasterRegistryEngine.upsertLocation(input);
    setEntity(prev => prev ? { ...prev, location } : prev);
    return location;
  }, []);

  const upsertClassification = useCallback(async (input: Parameters<typeof territorialMasterRegistryEngine.upsertClassification>[0]) => {
    const classification = await territorialMasterRegistryEngine.upsertClassification(input);
    setEntity(prev => prev ? { ...prev, classification } : prev);
    return classification;
  }, []);

  const addOperation = useCallback(async (input: Parameters<typeof territorialMasterRegistryEngine.addOperation>[0]) => {
    const operation = await territorialMasterRegistryEngine.addOperation(input);
    setEntity(prev => prev ? { ...prev, operations: [...(prev.operations ?? []), operation] } : prev);
    return operation;
  }, []);

  const createAssignment = useCallback(async (input: Parameters<typeof territorialMasterRegistryEngine.createAssignment>[0]) => {
    return territorialMasterRegistryEngine.createAssignment(input);
  }, []);

  return { entity, loading, error, createEntity, updateEntity, upsertOwner, upsertLocation, upsertClassification, addOperation, createAssignment };
}

// ---------------------------------------------------------------------------
// useTerritorialDuplicates — duplicate detection
// ---------------------------------------------------------------------------
export function useTerritorialDuplicates() {
  const { org } = useOrg();
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async (candidate: {
    businessName?: string;
    commercialName?: string;
    phone?: string;
    email?: string;
  }) => {
    if (!org) return;
    setChecking(true);
    setError(null);
    try {
      setDuplicates(await territorialMasterRegistryEngine.detectDuplicates(org.id, candidate));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setChecking(false);
    }
  }, [org]);

  return { duplicates, checking, error, check };
}

// ---------------------------------------------------------------------------
// useTerritorialPotential — potential score computation
// ---------------------------------------------------------------------------
export function useTerritorialPotential() {
  const [result, setResult] = useState<PotentialComputation | null>(null);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compute = useCallback(async (entityId: string) => {
    setComputing(true);
    setError(null);
    try {
      setResult(await territorialMasterRegistryEngine.computePotential(entityId));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setComputing(false);
    }
  }, []);

  return { result, computing, error, compute };
}

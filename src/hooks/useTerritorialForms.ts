import { useEffect, useState, useCallback } from 'react';
import { useOrg } from '../contexts/OrgContext';
import { territorialFieldCollectionEngine } from '../services/TerritorialFieldCollectionEngine';
import type { TerritorialForm } from '../services/TerritorialFieldCollectionEngine';
import type { FormSchema } from '../types';

// ---------------------------------------------------------------------------
// useTerritorialForms — form list with filters
// ---------------------------------------------------------------------------
export function useTerritorialForms(opts?: {
  isActive?: boolean;
  limit?: number;
}) {
  const { org } = useOrg();
  const [forms, setForms] = useState<TerritorialForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setForms(await territorialFieldCollectionEngine.getForms(org.id, opts));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [org, opts?.isActive, opts?.limit]);

  useEffect(() => { load(); }, [load]);

  const createForm = useCallback(async (input: {
    name: string;
    description?: string;
    schema: FormSchema;
  }) => {
    if (!org) throw new Error('No organization');
    const form = await territorialFieldCollectionEngine.createForm({
      organizationId: org.id,
      ...input,
    });
    setForms(prev => [form, ...prev]);
    return form;
  }, [org]);

  const updateForm = useCallback(async (id: string, patch: {
    name?: string;
    description?: string | null;
    schema?: FormSchema;
    is_active?: boolean;
  }, incrementVersion?: boolean) => {
    const updated = await territorialFieldCollectionEngine.updateForm(id, patch, incrementVersion);
    setForms(prev => prev.map(f => f.id === id ? updated : f));
    return updated;
  }, []);

  const deleteForm = useCallback(async (id: string) => {
    await territorialFieldCollectionEngine.deleteForm(id);
    setForms(prev => prev.filter(f => f.id !== id));
  }, []);

  return { forms, loading, error, reload: load, createForm, updateForm, deleteForm };
}

// ---------------------------------------------------------------------------
// useTerritorialForm — single form detail
// ---------------------------------------------------------------------------
export function useTerritorialForm(formId: string | null) {
  const [form, setForm] = useState<TerritorialForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!formId) { setForm(null); return; }
    setLoading(true);
    setError(null);
    territorialFieldCollectionEngine.getForm(formId)
      .then(setForm)
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [formId]);

  const updateForm = useCallback(async (patch: {
    name?: string;
    description?: string | null;
    schema?: FormSchema;
    is_active?: boolean;
  }, incrementVersion?: boolean) => {
    if (!formId) throw new Error('No form ID');
    const updated = await territorialFieldCollectionEngine.updateForm(formId, patch, incrementVersion);
    setForm(updated);
    return updated;
  }, [formId]);

  const deleteForm = useCallback(async () => {
    if (!formId) throw new Error('No form ID');
    await territorialFieldCollectionEngine.deleteForm(formId);
    setForm(null);
  }, [formId]);

  return { form, loading, error, updateForm, deleteForm };
}

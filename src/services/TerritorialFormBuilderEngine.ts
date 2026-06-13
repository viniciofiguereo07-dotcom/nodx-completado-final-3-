import { supabase } from '../lib/supabase';
import { territorialFieldCollectionEngine } from './TerritorialFieldCollectionEngine';
import type { FormSchema, FormField, LogicRule } from '../types';

// ---------------------------------------------------------------------------
// Form Types
// ---------------------------------------------------------------------------
export type TerritorialFormType =
  | 'commercial'
  | 'wash'
  | 'food_security'
  | 'livelihoods'
  | 'monitoring'
  | 'evaluation'
  | 'custom';

export const TERRITORIAL_FORM_TYPE_LABELS: Record<TerritorialFormType, string> = {
  commercial: 'Commercial',
  wash: 'WASH',
  food_security: 'Food Security',
  livelihoods: 'Livelihoods',
  monitoring: 'Monitoring',
  evaluation: 'Evaluation',
  custom: 'Custom',
};

// ---------------------------------------------------------------------------
// Section Types
// ---------------------------------------------------------------------------
export interface FormSection {
  id: string;
  name: string;
  description?: string;
  order: number;
  fields: FormField[];
  is_collapsible?: boolean;
  is_repeatable?: boolean;
}

// ---------------------------------------------------------------------------
// Scoring Types
// ---------------------------------------------------------------------------
export interface ScoringConfig {
  id: string;
  field_id: string;
  score_type: 'value_map' | 'range' | 'formula';
  value_map?: Record<string, number>;
  range_config?: Array<{ min: number; max: number; score: number }>;
  formula?: string;
  max_score?: number;
  weight?: number;
}

export interface FormScoringRule {
  id: string;
  name: string;
  description?: string;
  scoring_configs: ScoringConfig[];
  total_max_score?: number;
  passing_score?: number;
  grade_thresholds?: Array<{ min: number; max: number; label: string; color: string }>;
}

// ---------------------------------------------------------------------------
// Builder Form Types (extends TerritorialForm)
// ---------------------------------------------------------------------------
export interface BuilderForm {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  form_type: TerritorialFormType;
  version: number;
  schema: FormSchema;
  sections: FormSection[];
  scoring_rules: FormScoringRule[];
  lifecycle_status: 'draft' | 'review' | 'approved' | 'published' | 'archived';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  published_at?: string | null;
  archived_at?: string | null;
}

// ---------------------------------------------------------------------------
// Input Types
// ---------------------------------------------------------------------------
export interface CreateBuilderFormInput {
  organizationId: string;
  name: string;
  description?: string;
  formType?: TerritorialFormType;
  schema?: FormSchema;
  sections?: FormSection[];
  scoringRules?: FormScoringRule[];
  createdBy?: string;
}

export interface UpdateBuilderFormInput {
  name?: string;
  description?: string | null;
  formType?: TerritorialFormType;
  schema?: FormSchema;
  sections?: FormSection[];
  scoringRules?: FormScoringRule[];
  isActive?: boolean;
}

export interface DuplicateFormInput {
  organizationId: string;
  sourceFormId: string;
  newName: string;
  createdBy?: string;
}

export interface PublishFormInput {
  formId: string;
  publishedBy: string;
  changeSummary?: string;
}

// ---------------------------------------------------------------------------
// Question Types (for builder palette)
// ---------------------------------------------------------------------------
export type BuilderQuestionType =
  | 'text' | 'textarea'
  | 'number' | 'decimal' | 'currency'
  | 'date' | 'time' | 'datetime'
  | 'select' | 'multiselect' | 'dropdown'
  | 'boolean' | 'checkbox' | 'rating'
  | 'photo' | 'signature' | 'location'
  | 'calculated' | 'score';

export const BUILDER_QUESTION_TYPES: Array<{
  type: BuilderQuestionType;
  label: string;
  icon: string;
  group: string;
}> = [
  { type: 'text',      label: 'Short Text',     icon: 'Type',       group: 'Text' },
  { type: 'textarea', label: 'Long Text',       icon: 'AlignLeft',  group: 'Text' },
  { type: 'number',    label: 'Number',         icon: 'Hash',       group: 'Numeric' },
  { type: 'decimal',   label: 'Decimal',        icon: 'Hash',       group: 'Numeric' },
  { type: 'currency',  label: 'Currency',       icon: 'DollarSign', group: 'Numeric' },
  { type: 'date',      label: 'Date',           icon: 'Calendar',   group: 'Date & Time' },
  { type: 'time',      label: 'Time',           icon: 'Clock',      group: 'Date & Time' },
  { type: 'datetime',  label: 'Date & Time',    icon: 'Calendar',   group: 'Date & Time' },
  { type: 'select',    label: 'Single Choice',  icon: 'List',       group: 'Choice' },
  { type: 'multiselect', label: 'Multiple Choice', icon: 'CheckSquare', group: 'Choice' },
  { type: 'dropdown',  label: 'Dropdown',       icon: 'ChevronDown', group: 'Choice' },
  { type: 'boolean',   label: 'Yes / No',       icon: 'ToggleLeft', group: 'Choice' },
  { type: 'checkbox',  label: 'Checkbox',      icon: 'CheckSquare', group: 'Choice' },
  { type: 'rating',     label: 'Rating Scale',  icon: 'Star',       group: 'Scale' },
  { type: 'photo',     label: 'Photo',          icon: 'Camera',     group: 'Media' },
  { type: 'signature', label: 'Signature',      icon: 'PenTool',    group: 'Media' },
  { type: 'location',  label: 'GPS Location',   icon: 'MapPin',    group: 'Geo' },
  { type: 'calculated', label: 'Calculated',    icon: 'Calculator', group: 'Advanced' },
  { type: 'score',     label: 'Scoring Field', icon: 'Award',      group: 'Advanced' },
];

// ---------------------------------------------------------------------------
// Main Service
// ---------------------------------------------------------------------------
export class TerritorialFormBuilderEngine {

  // -------------------------------------------------------------------------
  // Create Form (Builder)
  // -------------------------------------------------------------------------
  async createBuilderForm(input: CreateBuilderFormInput): Promise<BuilderForm> {
    const schema: FormSchema = input.schema ?? { fields: [], logic: [], groups: [] };
    const sections: FormSection[] = input.sections ?? [];
    const scoringRules: FormScoringRule[] = input.scoringRules ?? [];

    // Create base form using existing engine
    const baseForm = await territorialFieldCollectionEngine.createForm({
      organizationId: input.organizationId,
      name: input.name,
      description: input.description,
      schema,
      createdBy: input.createdBy,
    });

    // Update with builder-specific metadata
    const { data, error } = await supabase
      .from('territorial_forms')
      .update({
        // Store builder metadata in schema's metadata
        schema: {
          ...schema,
          _builder_meta: {
            form_type: input.formType ?? 'custom',
            sections,
            scoring_rules: scoringRules,
          },
        },
      })
      .eq('id', baseForm.id)
      .select()
      .single();

    if (error) throw error;

    return this.mapToBuilderForm(data);
  }

  // -------------------------------------------------------------------------
  // Get Form (Builder)
  // -------------------------------------------------------------------------
  async getBuilderForm(id: string): Promise<BuilderForm | null> {
    const { data, error } = await supabase
      .from('territorial_forms')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return this.mapToBuilderForm(data);
  }

  // -------------------------------------------------------------------------
  // Get Forms (Builder)
  // -------------------------------------------------------------------------
  async getBuilderForms(organizationId: string, opts?: {
    formType?: TerritorialFormType;
    isActive?: boolean;
    lifecycleStatus?: string;
    limit?: number;
    offset?: number;
  }): Promise<BuilderForm[]> {
    let query = supabase
      .from('territorial_forms')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (opts?.isActive !== undefined) {
      query = query.eq('is_active', opts.isActive);
    }
    if (opts?.limit) query = query.limit(opts.limit);
    else query = query.limit(100);
    if (opts?.offset) {
      query = query.range(opts.offset, opts.offset + (opts.limit ?? 100) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;

    let forms = (data ?? []).map(this.mapToBuilderForm);

    // Filter by form_type in memory (stored in schema._builder_meta)
    if (opts?.formType) {
      forms = forms.filter(f => f.form_type === opts.formType);
    }
    if (opts?.lifecycleStatus) {
      forms = forms.filter(f => f.lifecycle_status === opts.lifecycleStatus);
    }

    return forms;
  }

  // -------------------------------------------------------------------------
  // Update Form (Builder)
  // -------------------------------------------------------------------------
  async updateBuilderForm(
    id: string,
    patch: UpdateBuilderFormInput,
    incrementVersion?: boolean
  ): Promise<BuilderForm> {
    const updateData: Record<string, unknown> = {};

    if (patch.name !== undefined) updateData.name = patch.name;
    if (patch.description !== undefined) updateData.description = patch.description;
    if (patch.isActive !== undefined) updateData.is_active = patch.isActive;

    if (patch.schema || patch.sections || patch.scoringRules || patch.formType) {
      // Get current schema
      const { data: current } = await supabase
        .from('territorial_forms')
        .select('schema')
        .eq('id', id)
        .single();

      const currentSchema = (current?.schema ?? {}) as FormSchema;
      const builderMeta = (currentSchema as Record<string, unknown>)._builder_meta as Record<string, unknown> ?? {};

      updateData.schema = {
        ...currentSchema,
        fields: patch.schema?.fields ?? currentSchema.fields ?? [],
        logic: patch.schema?.logic ?? currentSchema.logic ?? [],
        groups: patch.schema?.groups ?? currentSchema.groups ?? [],
        _builder_meta: {
          ...builderMeta,
          form_type: patch.formType ?? builderMeta.form_type ?? 'custom',
          sections: patch.sections ?? builderMeta.sections ?? [],
          scoring_rules: patch.scoringRules ?? builderMeta.scoring_rules ?? [],
        },
      };
    }

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
    return this.mapToBuilderForm(data);
  }

  // -------------------------------------------------------------------------
  // Duplicate Form
  // -------------------------------------------------------------------------
  async duplicateForm(input: DuplicateFormInput): Promise<BuilderForm> {
    const source = await this.getBuilderForm(input.sourceFormId);
    if (!source) throw new Error('Source form not found');

    return this.createBuilderForm({
      organizationId: input.organizationId,
      name: input.newName,
      description: source.description ?? undefined,
      formType: source.form_type,
      schema: {
        ...source.schema,
        _builder_meta: undefined, // Will be set with sections/scoringRules
      },
      sections: source.sections,
      scoringRules: source.scoring_rules,
      createdBy: input.createdBy,
    });
  }

  // -------------------------------------------------------------------------
  // Publish Form
  // -------------------------------------------------------------------------
  async publishForm(input: PublishFormInput): Promise<BuilderForm> {
    // Create a version snapshot
    const form = await this.getBuilderForm(input.formId);
    if (!form) throw new Error('Form not found');

    // Store version history
    await supabase.from('form_versions').insert({
      organization_id: form.organization_id,
      form_id: form.id,
      version_number: form.version,
      schema: form.schema,
      lifecycle_status: 'published',
      change_summary: input.changeSummary ?? null,
      published_at: new Date().toISOString(),
      created_by: input.publishedBy,
    });

    // Update form to published state
    const updateData: Record<string, unknown> = {
      is_active: true,
      version: form.version + 1,
      schema: {
        ...form.schema,
        _builder_meta: {
          ...((form.schema as Record<string, unknown>)._builder_meta as Record<string, unknown> ?? {}),
          lifecycle_status: 'published',
          published_at: new Date().toISOString(),
          published_by: input.publishedBy,
        },
      },
    };

    const { data, error } = await supabase
      .from('territorial_forms')
      .update(updateData)
      .eq('id', input.formId)
      .select()
      .single();

    if (error) throw error;
    return this.mapToBuilderForm(data);
  }

  // -------------------------------------------------------------------------
  // Archive Form
  // -------------------------------------------------------------------------
  async archiveForm(id: string, archivedBy: string): Promise<BuilderForm> {
    const form = await this.getBuilderForm(id);
    if (!form) throw new Error('Form not found');

    const updateData: Record<string, unknown> = {
      is_active: false,
      schema: {
        ...form.schema,
        _builder_meta: {
          ...((form.schema as Record<string, unknown>)._builder_meta as Record<string, unknown> ?? {}),
          lifecycle_status: 'archived',
          archived_at: new Date().toISOString(),
        },
      },
    };

    const { data, error } = await supabase
      .from('territorial_forms')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToBuilderForm(data);
  }

  // -------------------------------------------------------------------------
  // Delete Form
  // -------------------------------------------------------------------------
  async deleteBuilderForm(id: string): Promise<void> {
    await territorialFieldCollectionEngine.deleteForm(id);
  }

  // -------------------------------------------------------------------------
  // Section Management
  // -------------------------------------------------------------------------
  createSection(name: string, description?: string): FormSection {
    return {
      id: `section_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name,
      description,
      order: 0,
      fields: [],
      is_collapsible: true,
    };
  }

  addSectionToForm(form: BuilderForm, section: FormSection): BuilderForm {
    const sections = [...form.sections, { ...section, order: form.sections.length }];
    return { ...form, sections };
  }

  updateSection(form: BuilderForm, sectionId: string, patch: Partial<FormSection>): BuilderForm {
    const sections = form.sections.map(s =>
      s.id === sectionId ? { ...s, ...patch } : s
    );
    return { ...form, sections };
  }

  removeSection(form: BuilderForm, sectionId: string): BuilderForm {
    const sections = form.sections.filter(s => s.id !== sectionId);
    return { ...form, sections };
  }

  reorderSections(form: BuilderForm, sectionIds: string[]): BuilderForm {
    const ordered = sectionIds
      .map(id => form.sections.find(s => s.id === id))
      .filter(Boolean) as FormSection[];
    const sections = ordered.map((s, i) => ({ ...s, order: i }));
    return { ...form, sections };
  }

  moveFieldBetweenSections(
    form: BuilderForm,
    fieldId: string,
    fromSectionId: string,
    toSectionId: string,
    toIndex?: number
  ): BuilderForm {
    let field: FormField | undefined;
    const sections = form.sections.map(s => {
      if (s.id === fromSectionId) {
        const fields = s.fields.filter(f => {
          if (f.id === fieldId) {
            field = f;
            return false;
          }
          return true;
        });
        return { ...s, fields };
      }
      return s;
    }).map(s => {
      if (s.id === toSectionId && field) {
        const fields = [...s.fields];
        const idx = toIndex ?? fields.length;
        fields.splice(idx, 0, field);
        return { ...s, fields };
      }
      return s;
    });

    return { ...form, sections };
  }

  // -------------------------------------------------------------------------
  // Field Management
  // -------------------------------------------------------------------------
  createField(type: BuilderQuestionType, label: string): FormField {
    const id = `field_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const name = `f_${id.slice(-6)}`;

    const field: FormField = {
      id,
      type: type as FormField['type'],
      label,
      name,
      required: false,
    };

    // Add type-specific defaults
    if (type === 'select' || type === 'multiselect' || type === 'dropdown') {
      field.options = ['Option 1', 'Option 2', 'Option 3'];
    }
    if (type === 'rating') {
      field.columns = ['1', '2', '3', '4', '5'];
    }
    if (type === 'currency') {
      field.currency_code = 'USD';
    }
    if (type === 'calculated') {
      field.formula = '';
    }

    return field;
  }

  addFieldToSection(form: BuilderForm, sectionId: string, field: FormField): BuilderForm {
    const sections = form.sections.map(s => {
      if (s.id === sectionId) {
        return { ...s, fields: [...s.fields, field] };
      }
      return s;
    });
    return { ...form, sections };
  }

  updateFieldInSection(
    form: BuilderForm,
    sectionId: string,
    fieldId: string,
    patch: Partial<FormField>
  ): BuilderForm {
    const sections = form.sections.map(s => {
      if (s.id === sectionId) {
        const fields = s.fields.map(f =>
          f.id === fieldId ? { ...f, ...patch } : f
        );
        return { ...s, fields };
      }
      return s;
    });
    return { ...form, sections };
  }

  removeFieldFromSection(form: BuilderForm, sectionId: string, fieldId: string): BuilderForm {
    const sections = form.sections.map(s => {
      if (s.id === sectionId) {
        const fields = s.fields.filter(f => f.id !== fieldId);
        return { ...s, fields };
      }
      return s;
    });
    return { ...form, sections };
  }

  reorderFieldsInSection(form: BuilderForm, sectionId: string, fieldIds: string[]): BuilderForm {
    const sections = form.sections.map(s => {
      if (s.id === sectionId) {
        const fields = fieldIds
          .map(id => s.fields.find(f => f.id === id))
          .filter(Boolean) as FormField[];
        return { ...s, fields };
      }
      return s;
    });
    return { ...form, sections };
  }

  // -------------------------------------------------------------------------
  // Scoring Management
  // -------------------------------------------------------------------------
  createScoringRule(name: string): FormScoringRule {
    return {
      id: `scoring_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name,
      scoring_configs: [],
      grade_thresholds: [
        { min: 0, max: 59, label: 'Fail', color: '#ef4444' },
        { min: 60, max: 69, label: 'Pass', color: '#f59e0b' },
        { min: 70, max: 84, label: 'Good', color: '#3b82f6' },
        { min: 85, max: 100, label: 'Excellent', color: '#22c55e' },
      ],
    };
  }

  addScoringConfigToRule(rule: FormScoringRule, config: ScoringConfig): FormScoringRule {
    return {
      ...rule,
      scoring_configs: [...rule.scoring_configs, config],
    };
  }

  // -------------------------------------------------------------------------
  // Form Statistics
  // -------------------------------------------------------------------------
  async getFormStats(organizationId: string): Promise<{
    total: number;
    byType: Record<TerritorialFormType, number>;
    byStatus: Record<string, number>;
    thisMonth: number;
    published: number;
  }> {
    const forms = await this.getBuilderForms(organizationId);

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const byType: Record<TerritorialFormType, number> = {
      commercial: 0,
      wash: 0,
      food_security: 0,
      livelihoods: 0,
      monitoring: 0,
      evaluation: 0,
      custom: 0,
    };

    const byStatus: Record<string, number> = {
      draft: 0,
      review: 0,
      approved: 0,
      published: 0,
      archived: 0,
    };

    let thisMonth = 0;
    let published = 0;

    for (const form of forms) {
      byType[form.form_type] = (byType[form.form_type] ?? 0) + 1;
      byStatus[form.lifecycle_status] = (byStatus[form.lifecycle_status] ?? 0) + 1;
      if (new Date(form.created_at) >= thisMonthStart) thisMonth++;
      if (form.lifecycle_status === 'published') published++;
    }

    return {
      total: forms.length,
      byType,
      byStatus,
      thisMonth,
      published,
    };
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  private mapToBuilderForm(data: Record<string, unknown>): BuilderForm {
    const schema = data.schema as FormSchema ?? { fields: [], logic: [], groups: [] };
    const builderMeta = (schema as Record<string, unknown>)._builder_meta as Record<string, unknown> ?? {};

    return {
      id: data.id as string,
      organization_id: data.organization_id as string,
      name: data.name as string,
      description: data.description as string | null,
      form_type: (builderMeta.form_type as TerritorialFormType) ?? 'custom',
      version: data.version as number,
      schema,
      sections: (builderMeta.sections as FormSection[]) ?? [],
      scoring_rules: (builderMeta.scoring_rules as FormScoringRule[]) ?? [],
      lifecycle_status: (builderMeta.lifecycle_status as BuilderForm['lifecycle_status']) ?? 'draft',
      is_active: data.is_active as boolean,
      created_at: data.created_at as string,
      updated_at: data.updated_at as string,
      created_by: data.created_by as string | null,
      reviewed_by: builderMeta.reviewed_by as string | null,
      reviewed_at: builderMeta.reviewed_at as string | null,
      approved_by: builderMeta.approved_by as string | null,
      approved_at: builderMeta.approved_at as string | null,
      published_at: builderMeta.published_at as string | null,
      archived_at: builderMeta.archived_at as string | null,
    };
  }
}

export const territorialFormBuilderEngine = new TerritorialFormBuilderEngine();

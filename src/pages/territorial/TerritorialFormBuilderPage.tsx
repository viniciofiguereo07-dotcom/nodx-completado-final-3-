import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Eye, CreditCard as Edit2, Trash2, Send, Archive, Copy, Type, Hash, List, CheckSquare, Calendar, Camera, MapPin, Clock, ToggleLeft, AlignLeft, PenTool, Calculator, Star, ChevronUp, ChevronDown, ChevronRight, X, GripVertical, Settings, Layers, GitBranch, Award, DollarSign, Save, CheckCircle, AlertCircle, Play, Pause, MoreVertical, LayoutGrid, ArrowLeft, ArrowRight, Download, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import {
  territorialFormBuilderEngine,
  type BuilderForm,
  type FormSection,
  type FormScoringRule,
  type TerritorialFormType,
  type BuilderQuestionType,
  BUILDER_QUESTION_TYPES,
  TERRITORIAL_FORM_TYPE_LABELS,
} from '../../services/TerritorialFormBuilderEngine';
import type { FormField, LogicRule, LogicOperator, LogicAction } from '../../types';

// Form type cards
const FORM_TYPES: Array<{
  type: TerritorialFormType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
}> = [
  { type: 'commercial', label: 'Commercial', icon: DollarSign, color: 'bg-emerald-500', description: 'Sales, orders, inventory checks' },
  { type: 'wash', label: 'WASH', icon: Archive, color: 'bg-blue-500', description: 'Water & sanitation surveys' },
  { type: 'food_security', label: 'Food Security', icon: Archive, color: 'bg-amber-500', description: 'Food consumption & livelihood' },
  { type: 'livelihoods', label: 'Livelihoods', icon: Archive, color: 'bg-purple-500', description: 'Economic activities assessment' },
  { type: 'monitoring', label: 'Monitoring', icon: Eye, color: 'bg-cyan-500', description: 'Regular monitoring visits' },
  { type: 'evaluation', label: 'Evaluation', icon: CheckCircle, color: 'bg-rose-500', description: 'M&E data collection' },
  { type: 'custom', label: 'Custom', icon: Settings, color: 'bg-gray-500', description: 'Build your own form' },
];

// Logic operators
const LOGIC_OPERATORS: Array<{ value: LogicOperator; label: string }> = [
  { value: 'equals', label: '= equals' },
  { value: 'not_equals', label: '≠ not equals' },
  { value: 'greater_than', label: '> greater than' },
  { value: 'less_than', label: '< less than' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'not contains' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

// Logic actions
const LOGIC_ACTIONS: Array<{ value: LogicAction; label: string }> = [
  { value: 'show', label: 'Show field/section' },
  { value: 'hide', label: 'Hide field/section' },
  { value: 'require', label: 'Make required' },
  { value: 'unrequire', label: 'Make optional' },
  { value: 'jump_to_section', label: 'Jump to section' },
  { value: 'end_survey', label: 'End survey' },
];

// Field preview component
function FieldPreview({ field, sectionName }: { field: FormField; sectionName?: string }) {
  const hasOptions = ['select', 'multiselect', 'dropdown', 'rating'].includes(field.type);

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white hover:border-blue-300 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
          {field.type.replace('_', ' ')}
        </span>
        <span className="text-sm font-semibold text-gray-800">{field.label}</span>
        {field.required && <span className="text-red-500 text-xs">*</span>}
      </div>

      {field.type === 'text' && (
        <div className="h-8 bg-gray-50 rounded border border-gray-200 text-xs text-gray-400 px-2 flex items-center">
          {field.placeholder ?? 'Enter text...'}
        </div>
      )}

      {field.type === 'textarea' && (
        <div className="h-16 bg-gray-50 rounded border border-gray-200 text-xs text-gray-400 p-2">
          {field.placeholder ?? 'Enter longer text...'}
        </div>
      )}

      {(field.type === 'number' || field.type === 'decimal' || field.type === 'currency') && (
        <div className="h-8 bg-gray-50 rounded border border-gray-200 text-xs text-gray-400 px-2 flex items-center">
          {field.type === 'currency' ? `${field.currency_code ?? 'USD'} 0.00` : '0'}
        </div>
      )}

      {field.type === 'date' && (
        <div className="h-8 bg-gray-50 rounded border border-gray-200 text-xs text-gray-400 px-2 flex items-center">
          DD / MM / YYYY
        </div>
      )}

      {field.type === 'time' && (
        <div className="h-8 bg-gray-50 rounded border border-gray-200 text-xs text-gray-400 px-2 flex items-center">
          HH : MM
        </div>
      )}

      {field.type === 'boolean' && (
        <div className="flex gap-2">
          <div className="flex-1 h-8 bg-gray-50 rounded border border-gray-200 text-xs text-gray-500 flex items-center justify-center">Yes</div>
          <div className="flex-1 h-8 bg-gray-50 rounded border border-gray-200 text-xs text-gray-500 flex items-center justify-center">No</div>
        </div>
      )}

      {hasOptions && (
        <div className="space-y-1">
          {(field.options ?? ['Option 1', 'Option 2']).slice(0, 3).map((o, i) => (
            <div key={i} className="flex items-center gap-2 h-6 bg-gray-50 rounded border border-gray-200 px-2 text-xs text-gray-500">
              <div className={`w-3 h-3 rounded-${field.type === 'multiselect' ? 'sm' : 'full'} border border-gray-300`} />
              {o}
            </div>
          ))}
        </div>
      )}

      {field.type === 'rating' && (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} className="flex-1 h-8 bg-gray-50 rounded border border-gray-200 text-xs text-gray-400 flex items-center justify-center">
              <Star className="w-4 h-4" />
            </div>
          ))}
        </div>
      )}

      {field.type === 'photo' && (
        <div className="h-12 bg-gray-50 rounded border-2 border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-400">
          <Camera className="w-4 h-4 mr-1" /> Tap to capture
        </div>
      )}

      {field.type === 'signature' && (
        <div className="h-12 bg-gray-50 rounded border border-gray-200 flex items-center justify-center text-xs text-gray-400">
          <PenTool className="w-4 h-4 mr-1" /> Draw signature
        </div>
      )}

      {field.type === 'location' && (
        <div className="h-8 bg-gray-50 rounded border border-gray-200 text-xs text-gray-400 px-2 flex items-center">
          <MapPin className="w-4 h-4 mr-1" /> GPS Coordinates
        </div>
      )}

      {field.type === 'calculated' && (
        <div className="h-8 bg-amber-50 rounded border border-amber-200 text-xs text-amber-600 px-2 flex items-center">
          <Calculator className="w-4 h-4 mr-1" /> {field.formula ?? 'formula'}
        </div>
      )}

      {field.help_text && (
        <div className="text-xs text-gray-400 mt-1 italic">{field.help_text}</div>
      )}
    </div>
  );
}

// Section Editor Component
function SectionEditor({
  section,
  allSections,
  formFields,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAddField,
  onUpdateField,
  onDeleteField,
  onMoveField,
  onOpenLogic,
  expanded,
  onToggle,
}: {
  section: FormSection;
  allSections: FormSection[];
  formFields: FormField[];
  onUpdate: (patch: Partial<FormSection>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddField: (type: BuilderQuestionType) => void;
  onUpdateField: (fieldId: string, patch: Partial<FormField>) => void;
  onDeleteField: (fieldId: string) => void;
  onMoveField: (fieldId: string, direction: 'up' | 'down') => void;
  onOpenLogic: () => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);

  const fieldGroups = Array.from(new Set(BUILDER_QUESTION_TYPES.map(f => f.group)));

  return (
    <div className="border border-blue-200 bg-white rounded-xl overflow-hidden">
      {/* Section Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-blue-50 cursor-pointer"
        onClick={onToggle}
      >
        <GripVertical className="w-4 h-4 text-gray-300" />
        <Layers className="w-5 h-5 text-blue-600" />
        <div className="flex-1">
          <div className="font-semibold text-gray-800">{section.name || 'Unnamed Section'}</div>
          {section.description && (
            <div className="text-xs text-gray-500">{section.description}</div>
          )}
        </div>
        <div className="text-xs text-gray-400">{section.fields.length} fields</div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 text-gray-400 hover:text-red-500 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Section Body */}
      {expanded && (
        <div className="p-4 space-y-3">
          {/* Section Settings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Section Name</label>
              <input
                type="text"
                value={section.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="Enter section name..."
                className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Description (optional)</label>
              <input
                type="text"
                value={section.description ?? ''}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder="Brief description..."
                className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Fields */}
          {section.fields.length > 0 && (
            <div className="space-y-2">
              {section.fields.map((field, idx) => (
                <div key={field.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                  <div className="flex flex-col items-center gap-0.5 pt-1">
                    <button
                      onClick={() => onMoveField(field.id, 'up')}
                      disabled={idx === 0}
                      className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <GripVertical className="w-3 h-3 text-gray-300" />
                    <button
                      onClick={() => onMoveField(field.id, 'down')}
                      disabled={idx === section.fields.length - 1}
                      className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex-1">
                    {editingField === field.id ? (
                      <FieldEditorInline
                        field={field}
                        onSave={(patch) => {
                          onUpdateField(field.id, patch);
                          setEditingField(null);
                        }}
                        onCancel={() => setEditingField(null)}
                      />
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            {field.type.replace('_', ' ')}
                          </span>
                          <span className="text-sm font-medium text-gray-800">{field.label}</span>
                          {field.required && <span className="text-red-500 text-xs">*</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingField(field.id)}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteField(field.id)}
                            className="p-1 text-gray-400 hover:text-red-500 rounded"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Field Button */}
          <div className="relative">
            <button
              onClick={() => setShowFieldPicker(!showFieldPicker)}
              className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Question
            </button>

            {showFieldPicker && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-3 max-h-64 overflow-y-auto">
                {fieldGroups.map(group => (
                  <div key={group} className="mb-3 last:mb-0">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 px-1">
                      {group}
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {BUILDER_QUESTION_TYPES.filter(f => f.group === group).map(({ type, label }) => (
                        <button
                          key={type}
                          onClick={() => {
                            onAddField(type);
                            setShowFieldPicker(false);
                          }}
                          className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Logic Link */}
          <button
            onClick={onOpenLogic}
            className="w-full py-2 text-sm text-gray-500 hover:text-blue-600 flex items-center justify-center gap-2"
          >
            <GitBranch className="w-4 h-4" /> Configure section logic
          </button>
        </div>
      )}
    </div>
  );
}

// Inline Field Editor
function FieldEditorInline({
  field,
  onSave,
  onCancel,
}: {
  field: FormField;
  onSave: (patch: Partial<FormField>) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(field.label);
  const [name, setName] = useState(field.name);
  const [required, setRequired] = useState(field.required);
  const [placeholder, setPlaceholder] = useState(field.placeholder ?? '');
  const [helpText, setHelpText] = useState(field.help_text ?? '');
  const [options, setOptions] = useState<string[]>(field.options ?? []);
  const [newOption, setNewOption] = useState('');

  const hasOptions = ['select', 'multiselect', 'dropdown', 'rating'].includes(field.type);
  const hasPlaceholder = ['text', 'textarea', 'number', 'decimal', 'currency'].includes(field.type);

  const handleSave = () => {
    const patch: Partial<FormField> = {
      label,
      name,
      required,
      placeholder: placeholder || undefined,
      help_text: helpText || undefined,
      options: hasOptions ? options : undefined,
    };
    onSave(patch);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500">Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full mt-0.5 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Field Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-0.5 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
          />
        </div>
      </div>

      {hasPlaceholder && (
        <div>
          <label className="text-xs text-gray-500">Placeholder</label>
          <input
            type="text"
            value={placeholder}
            onChange={(e) => setPlaceholder(e.target.value)}
            className="w-full mt-0.5 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}

      {hasOptions && (
        <div>
          <label className="text-xs text-gray-500">Options</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {options.map((o, i) => (
              <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-xs rounded-full">
                {o}
                <button
                  onClick={() => setOptions(options.filter((_, j) => j !== i))}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-1 mt-1">
            <input
              type="text"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newOption.trim()) {
                  setOptions([...options, newOption.trim()]);
                  setNewOption('');
                  e.preventDefault();
                }
              }}
              placeholder="Add option..."
              className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={() => {
                if (newOption.trim()) {
                  setOptions([...options, newOption.trim()]);
                  setNewOption('');
                }
              }}
              className="px-2 py-1 bg-blue-600 text-white text-xs rounded"
            >
              Add
            </button>
          </div>
        </div>
      )}

      <div>
        <label className="text-xs text-gray-500">Help Text</label>
        <input
          type="text"
          value={helpText}
          onChange={(e) => setHelpText(e.target.value)}
          placeholder="Optional guidance..."
          className="w-full mt-0.5 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input
          type="checkbox"
          checked={required}
          onChange={(e) => setRequired(e.target.checked)}
          className="rounded"
        />
        <span className="text-gray-600">Required field</span>
      </label>

      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Save
        </button>
      </div>
    </div>
  );
}

// Logic Editor Component
function LogicEditor({
  logic,
  fields,
  sections,
  onChange,
}: {
  logic: LogicRule[];
  fields: FormField[];
  sections: FormSection[];
  onChange: (rules: LogicRule[]) => void;
}) {
  const addRule = () => {
    const rule: LogicRule = {
      id: `rule_${Date.now()}`,
      trigger_field: fields[0]?.name ?? '',
      operator: 'equals',
      value: '',
      action: 'hide',
      target_fields: [],
    };
    onChange([...logic, rule]);
  };

  const updateRule = (index: number, patch: Partial<LogicRule>) => {
    const updated = logic.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onChange(updated);
  };

  const deleteRule = (index: number) => {
    onChange(logic.filter((_, i) => i !== index));
  };

  if (fields.length < 2) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
        Add at least 2 questions to create logic rules
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <div className="text-sm font-semibold text-gray-700">Conditional Logic</div>
          <div className="text-xs text-gray-400">Rules control field visibility and flow</div>
        </div>
        <button
          onClick={addRule}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Add Rule
        </button>
      </div>

      {logic.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
          No logic rules. Click "Add Rule" to start.
        </div>
      ) : (
        <div className="space-y-3">
          {logic.map((rule, i) => (
            <div key={rule.id} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase">Rule {i + 1}</span>
                <button
                  onClick={() => deleteRule(i)}
                  className="p-1 text-gray-400 hover:text-red-500 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-500">When</label>
                  <select
                    value={rule.trigger_field}
                    onChange={(e) => updateRule(i, { trigger_field: e.target.value })}
                    className="w-full mt-0.5 px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                  >
                    {fields.map((f) => (
                      <option key={f.id} value={f.name}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Condition</label>
                  <select
                    value={rule.operator}
                    onChange={(e) => updateRule(i, { operator: e.target.value as LogicOperator })}
                    className="w-full mt-0.5 px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                  >
                    {LOGIC_OPERATORS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Value</label>
                  {!['is_empty', 'is_not_empty'].includes(rule.operator) && (
                    <input
                      type="text"
                      value={String(rule.value ?? '')}
                      onChange={(e) => updateRule(i, { value: e.target.value })}
                      className="w-full mt-0.5 px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Then</label>
                  <select
                    value={rule.action}
                    onChange={(e) => updateRule(i, { action: e.target.value as LogicAction })}
                    className="w-full mt-0.5 px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                  >
                    {LOGIC_ACTIONS.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>
                {!['jump_to_section', 'end_survey'].includes(rule.action) && (
                  <div>
                    <label className="text-xs text-gray-500">Target Fields</label>
                    <select
                      multiple
                      value={rule.target_fields ?? []}
                      onChange={(e) =>
                        updateRule(i, {
                          target_fields: Array.from(e.target.selectedOptions, (o) => o.value),
                        })
                      }
                      className="w-full mt-0.5 px-2 py-1 text-sm border border-gray-200 rounded-lg h-16"
                    >
                      {fields
                        .filter((f) => f.name !== rule.trigger_field)
                        .map((f) => (
                          <option key={f.id} value={f.name}>
                            {f.label}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Scoring Editor Component
function ScoringEditor({
  scoringRules,
  fields,
  onChange,
}: {
  scoringRules: FormScoringRule[];
  fields: FormField[];
  onChange: (rules: FormScoringRule[]) => void;
}) {
  const addScoringRule = () => {
    const rule = territorialFormBuilderEngine.createScoringRule('New Scoring Rule');
    onChange([...scoringRules, rule]);
  };

  if (scoringRules.length === 0) {
    return (
      <div className="text-center py-8">
        <Award className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <div className="text-sm text-gray-500 mb-3">No scoring rules configured</div>
        <button
          onClick={addScoringRule}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          Add Scoring
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {scoringRules.map((rule, i) => (
        <div key={rule.id} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <input
              type="text"
              value={rule.name}
              onChange={(e) => {
                const updated = [...scoringRules];
                updated[i] = { ...updated[i], name: e.target.value };
                onChange(updated);
              }}
              className="font-semibold text-gray-800 border-none outline-none"
            />
            <button
              onClick={() => onChange(scoringRules.filter((_, j) => j !== i))}
              className="p-1 text-gray-400 hover:text-red-500 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Passing Score</label>
              <input
                type="number"
                value={rule.passing_score ?? ''}
                onChange={(e) => {
                  const updated = [...scoringRules];
                  updated[i] = { ...updated[i], passing_score: e.target.value ? +e.target.value : undefined };
                  onChange(updated);
                }}
                placeholder="60"
                className="w-full mt-0.5 px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Max Score</label>
              <input
                type="number"
                value={rule.total_max_score ?? ''}
                onChange={(e) => {
                  const updated = [...scoringRules];
                  updated[i] = { ...updated[i], total_max_score: e.target.value ? +e.target.value : undefined };
                  onChange(updated);
                }}
                placeholder="100"
                className="w-full mt-0.5 px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
              />
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={addScoringRule}
        className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500"
      >
        <Plus className="w-4 h-4 inline mr-1" /> Add Scoring Rule
      </button>
    </div>
  );
}

// Main Page Component
export function TerritorialFormBuilderPage() {
  const { org } = useOrg();
  const { user } = useAuth();

  // List view state
  const [forms, setForms] = useState<BuilderForm[]>([]);
  const [loading, setLoading] = useState(true);

  // View mode
  const [view, setView] = useState<'list' | 'type_select' | 'builder'>('list');
  const [selectedFormType, setSelectedFormType] = useState<TerritorialFormType | null>(null);
  const [editingForm, setEditingForm] = useState<BuilderForm | null>(null);

  // Builder state
  const [activeTab, setActiveTab] = useState<'design' | 'logic' | 'scoring' | 'preview'>('design');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Form builder state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState<TerritorialFormType>('custom');
  const [sections, setSections] = useState<FormSection[]>([]);
  const [logic, setLogic] = useState<LogicRule[]>([]);
  const [scoringRules, setScoringRules] = useState<FormScoringRule[]>([]);
  const [saving, setSaving] = useState(false);

  // Modals
  const [deleteTarget, setDeleteTarget] = useState<BuilderForm | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<BuilderForm | null>(null);
  const [publishTarget, setPublishTarget] = useState<BuilderForm | null>(null);

  // Load forms
  const loadForms = useCallback(async () => {
    if (!org) return;
    setLoading(true);
    try {
      const data = await territorialFormBuilderEngine.getBuilderForms(org.id);
      setForms(data);
    } catch (e) {
      console.error('Failed to load forms:', e);
    } finally {
      setLoading(false);
    }
  }, [org]);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  // Get all fields from all sections
  const allFields = sections.flatMap((s) => s.fields);

  // Open builder for new form
  const openNewBuilder = (type: TerritorialFormType) => {
    setSelectedFormType(type);
    setFormType(type);
    setEditingForm(null);
    setFormName('');
    setFormDesc('');
    setSections([]);
    setLogic([]);
    setScoringRules([]);
    setExpandedSections(new Set());
    setActiveTab('design');
    setView('builder');
  };

  // Open builder for existing form
  const openEditBuilder = (form: BuilderForm) => {
    setEditingForm(form);
    setSelectedFormType(form.form_type);
    setFormType(form.form_type);
    setFormName(form.name);
    setFormDesc(form.description ?? '');
    setSections(form.sections);
    setLogic((form.schema.logic as LogicRule[]) ?? []);
    setScoringRules(form.scoring_rules);
    setExpandedSections(new Set(form.sections.map((s) => s.id)));
    setActiveTab('design');
    setView('builder');
  };

  // Add section
  const addSection = () => {
    const section = territorialFormBuilderEngine.createSection(
      `Section ${sections.length + 1}`
    );
    setSections([...sections, section]);
    setExpandedSections((prev) => new Set([...prev, section.id]));
  };

  // Update section
  const updateSection = (sectionId: string, patch: Partial<FormSection>) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, ...patch } : s))
    );
  };

  // Delete section
  const deleteSection = (sectionId: string) => {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.delete(sectionId);
      return next;
    });
  };

  // Move section
  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    const idx = sections.findIndex((s) => s.id === sectionId);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= sections.length) return;

    const newSections = [...sections];
    [newSections[idx], newSections[newIdx]] = [newSections[newIdx], newSections[idx]];
    newSections.forEach((s, i) => (s.order = i));
    setSections(newSections);
  };

  // Add field to section
  const addFieldToSection = (sectionId: string, type: BuilderQuestionType) => {
    const label = BUILDER_QUESTION_TYPES.find((t) => t.type === type)?.label ?? type;
    const field = territorialFormBuilderEngine.createField(type, label);
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, fields: [...s.fields, field] } : s
      )
    );
  };

  // Update field in section
  const updateFieldInSection = (
    sectionId: string,
    fieldId: string,
    patch: Partial<FormField>
  ) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, fields: s.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)) }
          : s
      )
    );
  };

  // Delete field from section
  const deleteFieldFromSection = (sectionId: string, fieldId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) }
          : s
      )
    );
  };

  // Move field in section
  const moveFieldInSection = (
    sectionId: string,
    fieldId: string,
    direction: 'up' | 'down'
  ) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        const idx = s.fields.findIndex((f) => f.id === fieldId);
        if (idx === -1) return s;
        const newIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= s.fields.length) return s;
        const newFields = [...s.fields];
        [newFields[idx], newFields[newIdx]] = [newFields[newIdx], newFields[idx]];
        return { ...s, fields: newFields };
      })
    );
  };

  // Toggle section expand
  const toggleSectionExpand = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Save form
  const handleSave = async (publish = false) => {
    if (!org || !user || !formName.trim()) return;
    setSaving(true);

    try {
      const schema = {
        fields: allFields,
        logic,
        groups: [],
      };

      if (editingForm) {
        await territorialFormBuilderEngine.updateBuilderForm(editingForm.id, {
          name: formName,
          description: formDesc || null,
          formType,
          schema,
          sections,
          scoringRules,
        });

        if (publish) {
          await territorialFormBuilderEngine.publishForm({
            formId: editingForm.id,
            publishedBy: user.id,
          });
        }
      } else {
        const newForm = await territorialFormBuilderEngine.createBuilderForm({
          organizationId: org.id,
          name: formName,
          description: formDesc || undefined,
          formType,
          schema,
          sections,
          scoringRules,
          createdBy: user.id,
        });

        if (publish) {
          await territorialFormBuilderEngine.publishForm({
            formId: newForm.id,
            publishedBy: user.id,
          });
        }
      }

      setView('list');
      await loadForms();
    } catch (e) {
      console.error('Failed to save form:', e);
    } finally {
      setSaving(false);
    }
  };

  // Delete form
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await territorialFormBuilderEngine.deleteBuilderForm(deleteTarget.id);
      setDeleteTarget(null);
      await loadForms();
    } catch (e) {
      console.error('Failed to delete form:', e);
    }
  };

  // Duplicate form
  const handleDuplicate = async () => {
    if (!duplicateTarget || !org || !user) return;
    try {
      await territorialFormBuilderEngine.duplicateForm({
        organizationId: org.id,
        sourceFormId: duplicateTarget.id,
        newName: `${duplicateTarget.name} (Copy)`,
        createdBy: user.id,
      });
      setDuplicateTarget(null);
      await loadForms();
    } catch (e) {
      console.error('Failed to duplicate form:', e);
    }
  };

  // Publish form
  const handlePublish = async () => {
    if (!publishTarget || !user) return;
    try {
      await territorialFormBuilderEngine.publishForm({
        formId: publishTarget.id,
        publishedBy: user.id,
      });
      setPublishTarget(null);
      await loadForms();
    } catch (e) {
      console.error('Failed to publish form:', e);
    }
  };

  // Type Select View
  if (view === 'type_select') {
    return (
      <div>
        <PageHeader
          title="New Form"
          subtitle="Select a form type to get started"
          breadcrumb={[{ label: 'Form Builder', path: '/form-builder' }, { label: 'Select Type' }]}
          actions={
            <button
              onClick={() => setView('list')}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {FORM_TYPES.map(({ type, label, icon: Icon, color, description }) => (
            <button
              key={type}
              onClick={() => openNewBuilder(type)}
              className="bg-white rounded-2xl border border-gray-100 p-6 text-left hover:border-blue-300 hover:shadow-lg transition-all group"
            >
              <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-1">{label}</h3>
              <p className="text-sm text-gray-500">{description}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Builder View
  if (view === 'builder') {
    return (
      <div className="h-[calc(100vh-7rem)] flex flex-col">
        <PageHeader
          title={editingForm ? `Edit: ${editingForm.name}` : `New ${TERRITORIAL_FORM_TYPE_LABELS[formType]} Form`}
          breadcrumb={[
            { label: 'Form Builder', path: '/form-builder' },
            { label: editingForm ? 'Edit' : 'New' },
          ]}
          actions={
            <div className="flex items-center gap-3">
              <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                {(['design', 'logic', 'scoring', 'preview'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                      activeTab === t
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setView('list')}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave(false)}
                disabled={saving || !formName.trim()}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50"
              >
                Save Draft
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={saving || !formName.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> Publish
              </button>
            </div>
          }
        />

        <div className="flex-1 overflow-hidden flex gap-6 mt-4">
          {activeTab === 'design' && (
            <>
              {/* Left: Section / Field Add Panel */}
              <div className="w-56 flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 overflow-y-auto">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Form Structure
                </div>
                <button
                  onClick={addSection}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 mb-4"
                >
                  <Plus className="w-4 h-4" /> Add Section
                </button>

                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Quick Add Question
                </div>
                {['text', 'number', 'select', 'date', 'photo', 'signature', 'location', 'boolean'].map((type) => {
                  const info = BUILDER_QUESTION_TYPES.find((t) => t.type === type);
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        if (sections.length > 0) {
                          addFieldToSection(sections[sections.length - 1].id, type as BuilderQuestionType);
                          setExpandedSections((prev) => new Set([...prev, sections[sections.length - 1].id]));
                        }
                      }}
                      disabled={sections.length === 0}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {info?.label ?? type}
                    </button>
                  );
                })}
              </div>

              {/* Center: Form Builder Canvas */}
              <div className="flex-1 overflow-y-auto">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  {/* Form Header */}
                  <div className="mb-6 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {TERRITORIAL_FORM_TYPE_LABELS[formType]}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Enter form name..."
                      className="w-full text-xl font-bold text-gray-900 placeholder-gray-300 border-none outline-none bg-transparent"
                    />
                    <input
                      type="text"
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      placeholder="Description (optional)"
                      className="w-full text-sm text-gray-500 placeholder-gray-300 border-none outline-none bg-transparent mt-1"
                    />
                  </div>

                  {/* Sections */}
                  {sections.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                      <Layers className="w-10 h-10 text-gray-300 mb-3" />
                      <div className="text-gray-500 font-medium mb-1">No sections yet</div>
                      <div className="text-gray-400 text-sm mb-4">Add a section to start building your form</div>
                      <button
                        onClick={addSection}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4" /> Add First Section
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sections
                        .sort((a, b) => a.order - b.order)
                        .map((section) => (
                          <SectionEditor
                            key={section.id}
                            section={section}
                            allSections={sections}
                            formFields={allFields}
                            onUpdate={(patch) => updateSection(section.id, patch)}
                            onDelete={() => deleteSection(section.id)}
                            onMoveUp={() => moveSection(section.id, 'up')}
                            onMoveDown={() => moveSection(section.id, 'down')}
                            onAddField={(type) => addFieldToSection(section.id, type)}
                            onUpdateField={(fieldId, patch) =>
                              updateFieldInSection(section.id, fieldId, patch)
                            }
                            onDeleteField={(fieldId) => deleteFieldFromSection(section.id, fieldId)}
                            onMoveField={(fieldId, dir) =>
                              moveFieldInSection(section.id, fieldId, dir)
                            }
                            onOpenLogic={() => setActiveTab('logic')}
                            expanded={expandedSections.has(section.id)}
                            onToggle={() => toggleSectionExpand(section.id)}
                          />
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'logic' && (
            <div className="flex-1 overflow-y-auto">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <LogicEditor
                  logic={logic}
                  fields={allFields}
                  sections={sections}
                  onChange={setLogic}
                />
              </div>
            </div>
          )}

          {activeTab === 'scoring' && (
            <div className="flex-1 overflow-y-auto">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-5 h-5 text-amber-500" />
                  <h2 className="text-lg font-bold text-gray-900">Scoring Configuration</h2>
                </div>
                <ScoringEditor
                  scoringRules={scoringRules}
                  fields={allFields}
                  onChange={setScoringRules}
                />
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-lg mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {formName || 'Untitled Form'}
                </h2>
                {formDesc && <p className="text-sm text-gray-500 mb-4">{formDesc}</p>}

                {logic.length > 0 && (
                  <div className="mb-4 p-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-600 flex items-center gap-2">
                    <GitBranch className="w-3.5 h-3.5" /> {logic.length} logic rule
                    {logic.length !== 1 ? 's' : ''} active
                  </div>
                )}

                {sections.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    No fields to preview. Switch to Design tab to add content.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {sections
                      .sort((a, b) => a.order - b.order)
                      .map((section) => (
                        <div key={section.id}>
                          <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
                            {section.name}
                          </h3>
                          <div className="space-y-3">
                            {section.fields.map((field) => (
                              <FieldPreview
                                key={field.id}
                                field={field}
                                sectionName={section.name}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {sections.some((s) => s.fields.length > 0) && (
                  <button className="w-full mt-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700">
                    Submit Form
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // List View
  return (
    <div>
      <PageHeader
        title="Form Builder"
        subtitle="Create dynamic forms for field data collection"
        actions={
          <button
            onClick={() => setView('type_select')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Form
          </button>
        }
      />

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : forms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title="No forms yet"
            description="Create dynamic forms for your field collection workflows"
            action={
              <button
                onClick={() => setView('type_select')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl"
              >
                <Plus className="w-4 h-4" /> New Form
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map((form) => (
            <div
              key={form.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${
                      FORM_TYPES.find((t) => t.type === form.form_type)?.color ?? 'bg-gray-100'
                    } text-white`}
                  >
                    {TERRITORIAL_FORM_TYPE_LABELS[form.form_type]}
                  </span>
                </div>
                <StatusBadge
                  status={
                    form.lifecycle_status === 'published'
                      ? 'active'
                      : form.lifecycle_status
                  }
                />
              </div>

              <h3 className="font-bold text-gray-900 mb-1">{form.name}</h3>
              {form.description && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{form.description}</p>
              )}

              <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                <span>
                  {form.sections.reduce((sum, s) => sum + s.fields.length, 0)} fields
                </span>
                <span>·</span>
                <span>v{form.version}</span>
                {(form.schema.logic?.length ?? 0) > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-blue-500 flex items-center gap-0.5">
                      <GitBranch className="w-3 h-3" />
                      {form.schema.logic.length} rules
                    </span>
                  </>
                )}
                {form.scoring_rules.length > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-amber-500 flex items-center gap-0.5">
                      <Award className="w-3 h-3" />
                      scoring
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditBuilder(form)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex-1 justify-center"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>

                {form.lifecycle_status !== 'published' && (
                  <button
                    onClick={() => setPublishTarget(form)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" /> Publish
                  </button>
                )}

                <button
                  onClick={() => setDuplicateTarget(form)}
                  className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 border border-gray-200 rounded-xl transition-colors"
                  title="Duplicate"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setDeleteTarget(form)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-200 rounded-xl transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Form"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm bg-red-600 text-white font-semibold rounded-xl"
            >
              Delete
            </button>
          </div>
        }
      >
        <div className="flex items-start gap-3 text-sm text-gray-600">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <span>
            Delete <strong>{deleteTarget?.name}</strong>? Existing submissions will be preserved
            but no new submissions can be collected.
          </span>
        </div>
      </Modal>

      {/* Duplicate Modal */}
      <Modal
        open={!!duplicateTarget}
        onClose={() => setDuplicateTarget(null)}
        title="Duplicate Form"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDuplicateTarget(null)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleDuplicate}
              className="px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-xl"
            >
              Duplicate
            </button>
          </div>
        }
      >
        <div className="text-sm text-gray-600">
          Create a copy of <strong>{duplicateTarget?.name}</strong>?
        </div>
      </Modal>

      {/* Publish Modal */}
      <Modal
        open={!!publishTarget}
        onClose={() => setPublishTarget(null)}
        title="Publish Form"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setPublishTarget(null)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handlePublish}
              className="px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-xl"
            >
              Publish
            </button>
          </div>
        }
      >
        <div className="text-sm text-gray-600">
          Publish <strong>{publishTarget?.name}</strong>? This will make it available for field
          collection.
        </div>
      </Modal>
    </div>
  );
}

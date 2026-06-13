import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Plus, Eye, Edit2, Trash2, Send, Archive,
  Type, Hash, List, CheckSquare, Calendar, Camera,
  MapPin, QrCode, Repeat, ToggleLeft, AlignLeft,
  AlertCircle, ChevronUp, ChevronDown, Copy,
  X, GripVertical, Clock, Mic, Video, PenTool,
  DollarSign, BarChart2, Grid, Sliders, Calculator,
  GitBranch, Plus as PlusIcon, Minus,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import type { FormTemplate, FormField, FormFieldType, LogicRule, LogicOperator, LogicAction } from '../../types';

const FIELD_TYPES: Array<{ type: FormFieldType; label: string; icon: React.ComponentType<{ className?: string }>; group: string }> = [
  // Text
  { type: 'text',        label: 'Short Text',    icon: Type,        group: 'Text' },
  { type: 'textarea',    label: 'Long Text',     icon: AlignLeft,   group: 'Text' },
  // Numeric
  { type: 'number',      label: 'Number',        icon: Hash,        group: 'Numeric' },
  { type: 'decimal',     label: 'Decimal',       icon: Hash,        group: 'Numeric' },
  { type: 'currency',    label: 'Currency',      icon: DollarSign,  group: 'Numeric' },
  { type: 'calculated',  label: 'Calculated',    icon: Calculator,  group: 'Numeric' },
  // Date/Time
  { type: 'date',        label: 'Date',          icon: Calendar,    group: 'Date & Time' },
  { type: 'time',        label: 'Time',          icon: Clock,       group: 'Date & Time' },
  { type: 'datetime',    label: 'Date & Time',   icon: Calendar,    group: 'Date & Time' },
  // Choice
  { type: 'select',      label: 'Single Choice', icon: List,        group: 'Choice' },
  { type: 'multiselect', label: 'Multi-Choice',  icon: CheckSquare, group: 'Choice' },
  { type: 'dropdown',    label: 'Dropdown',      icon: ChevronDown, group: 'Choice' },
  { type: 'boolean',     label: 'Yes / No',      icon: ToggleLeft,  group: 'Choice' },
  { type: 'ranking',     label: 'Ranking',       icon: BarChart2,   group: 'Choice' },
  // Scale
  { type: 'likert',      label: 'Likert Scale',  icon: Sliders,     group: 'Scale' },
  { type: 'matrix',      label: 'Matrix Grid',   icon: Grid,        group: 'Scale' },
  // Media
  { type: 'photo',       label: 'Single Photo',  icon: Camera,      group: 'Media' },
  { type: 'photo_multi', label: 'Multi Photo',   icon: Camera,      group: 'Media' },
  { type: 'audio',       label: 'Audio',         icon: Mic,         group: 'Media' },
  { type: 'video',       label: 'Video',         icon: Video,       group: 'Media' },
  { type: 'signature',   label: 'Signature',     icon: PenTool,     group: 'Media' },
  // Geo & Scan
  { type: 'location',    label: 'GPS Location',  icon: MapPin,      group: 'Geo & Scan' },
  { type: 'barcode',     label: 'Barcode',       icon: QrCode,      group: 'Geo & Scan' },
  { type: 'qr',          label: 'QR Code',       icon: QrCode,      group: 'Geo & Scan' },
  // Structure
  { type: 'repeat_group',label: 'Repeat Group',  icon: Repeat,      group: 'Structure' },
  { type: 'checkbox',    label: 'Checkbox',      icon: CheckSquare, group: 'Structure' },
];

const LOGIC_OPERATORS: Array<{ value: LogicOperator; label: string }> = [
  { value: 'equals',       label: '= equals' },
  { value: 'not_equals',   label: '≠ not equals' },
  { value: 'greater_than', label: '> greater than' },
  { value: 'less_than',    label: '< less than' },
  { value: 'contains',     label: 'contains' },
  { value: 'not_contains', label: 'not contains' },
  { value: 'is_empty',     label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

const LOGIC_ACTIONS: Array<{ value: LogicAction; label: string }> = [
  { value: 'show',              label: 'Show field' },
  { value: 'hide',              label: 'Hide field' },
  { value: 'require',           label: 'Make required' },
  { value: 'unrequire',         label: 'Make optional' },
  { value: 'jump_to_section',   label: 'Jump to section' },
  { value: 'end_survey',        label: 'End survey' },
];

function FieldPreview({ field }: { field: FormField }) {
  const Icon = FIELD_TYPES.find(t => t.type === field.type)?.icon ?? Type;
  const mediaTypes: FormFieldType[] = ['photo','photo_multi','audio','video'];
  const choiceTypes: FormFieldType[] = ['select','multiselect','dropdown','ranking'];
  const scaleTypes: FormFieldType[] = ['likert','matrix'];

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white hover:border-blue-300 hover:shadow-sm transition-all">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <span className="text-sm font-semibold text-gray-800">{field.label}</span>
        {field.required && <span className="text-red-500 text-xs font-bold ml-0.5">*</span>}
      </div>

      {(field.type === 'text' || field.type === 'textarea') && (
        <div className={`bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-400 px-3 flex items-start ${field.type === 'textarea' ? 'h-14 py-2' : 'h-9 items-center'}`}>
          {field.placeholder ?? 'Enter text...'}
        </div>
      )}
      {(field.type === 'number' || field.type === 'decimal') && (
        <div className="h-9 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-400 px-3 flex items-center">0{field.type === 'decimal' ? '.00' : ''}</div>
      )}
      {field.type === 'currency' && (
        <div className="h-9 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-400 px-3 flex items-center gap-1">
          <span className="font-mono">{field.currency_code ?? 'USD'}</span>
          <span>0.00</span>
        </div>
      )}
      {field.type === 'calculated' && (
        <div className="h-9 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-600 px-3 flex items-center gap-1">
          <Calculator className="w-3.5 h-3.5" />
          <span className="font-mono text-xs">{field.formula ?? 'formula...'}</span>
        </div>
      )}
      {(field.type === 'date' || field.type === 'datetime') && (
        <div className="h-9 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-400 px-3 flex items-center">
          {field.type === 'date' ? 'DD / MM / YYYY' : 'DD / MM / YYYY  HH:MM'}
        </div>
      )}
      {field.type === 'time' && <div className="h-9 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-400 px-3 flex items-center">HH : MM</div>}
      {field.type === 'boolean' && (
        <div className="flex gap-2">
          {['Yes', 'No'].map(o => (
            <div key={o} className="flex-1 h-9 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-400 flex items-center justify-center">{o}</div>
          ))}
        </div>
      )}
      {choiceTypes.includes(field.type) && (
        <div className="space-y-1.5">
          {(field.options?.slice(0, 3) ?? ['Option A', 'Option B', 'Option C']).map((o, i) => (
            <div key={i} className="flex items-center gap-2 h-8 bg-gray-50 rounded-lg border border-gray-200 px-3 text-sm text-gray-500">
              <div className={`w-3.5 h-3.5 rounded-${field.type === 'multiselect' ? 'sm' : 'full'} border-2 border-gray-300 flex-shrink-0`} />
              {o}
            </div>
          ))}
        </div>
      )}
      {field.type === 'likert' && (
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} className="flex-1 h-9 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-400 flex items-center justify-center font-medium">{n}</div>
          ))}
        </div>
      )}
      {field.type === 'matrix' && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="p-1" />
                {(field.columns ?? ['Col 1', 'Col 2', 'Col 3']).map((c, i) => (
                  <th key={i} className="p-1 text-gray-400 text-center font-medium">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(field.rows ?? ['Row 1', 'Row 2']).map((r, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="p-1 text-gray-500 pr-3">{r}</td>
                  {(field.columns ?? ['', '', '']).map((_, j) => (
                    <td key={j} className="p-1 text-center"><div className="w-4 h-4 rounded-full border-2 border-gray-300 mx-auto" /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {mediaTypes.includes(field.type) && (
        <div className="h-14 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-sm text-gray-400">
          <Icon className="w-4 h-4 mr-2" />
          {field.type === 'photo' ? 'Tap to capture photo'
            : field.type === 'photo_multi' ? 'Tap to add photos'
            : field.type === 'audio' ? 'Tap to record audio'
            : field.type === 'video' ? 'Tap to record video'
            : 'Draw signature'}
        </div>
      )}
      {field.type === 'signature' && (
        <div className="h-20 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center text-sm text-gray-400">
          <PenTool className="w-4 h-4 mr-2" /> Draw signature here
        </div>
      )}
      {field.type === 'location' && (
        <div className="h-9 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-400 px-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-400" />
          <span>GPS Coordinates (Lat, Lng)</span>
        </div>
      )}
      {(field.type === 'barcode' || field.type === 'qr') && (
        <div className="h-9 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-400 px-3 flex items-center gap-2">
          <QrCode className="w-4 h-4" />
          Scan {field.type === 'barcode' ? 'barcode' : 'QR code'}
        </div>
      )}
      {field.type === 'repeat_group' && (
        <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-2 text-xs text-blue-500">
          <div className="flex items-center gap-1.5 mb-1"><Repeat className="w-3.5 h-3.5" /> Repeat group ({field.fields?.length ?? 0} sub-fields)</div>
        </div>
      )}
      {field.type === 'checkbox' && (
        <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-gray-300 rounded" /><span className="text-sm text-gray-400">{field.label}</span></div>
      )}

      {field.help_text && <div className="text-xs text-gray-400 mt-2 italic">{field.help_text}</div>}
    </div>
  );
}

function FieldEditor({ field, onChange, onDelete, onMoveUp, onMoveDown }: {
  field: FormField;
  onChange: (f: FormField) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [optionInput, setOptionInput] = useState('');
  const [rowInput, setRowInput] = useState('');
  const [colInput, setColInput] = useState('');
  const hasOptions = ['select', 'multiselect', 'dropdown', 'ranking'].includes(field.type);

  return (
    <div className="border border-blue-200 bg-blue-50/20 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-gray-300" />
          <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full capitalize">
            {FIELD_TYPES.find(t => t.type === field.type)?.label ?? field.type}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onMoveUp} className="p-1 text-gray-400 hover:text-gray-600 rounded"><ChevronUp className="w-4 h-4" /></button>
          <button onClick={onMoveDown} className="p-1 text-gray-400 hover:text-gray-600 rounded"><ChevronDown className="w-4 h-4" /></button>
          <button onClick={onDelete} className="p-1 text-red-400 hover:text-red-600 rounded"><X className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-gray-600">Label *</label>
          <input type="text" value={field.label} onChange={e => onChange({ ...field, label: e.target.value })}
            className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Field name</label>
          <input type="text" value={field.name} onChange={e => onChange({ ...field, name: e.target.value })}
            className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={field.required} onChange={e => onChange({ ...field, required: e.target.checked })} className="rounded" />
          <span className="text-gray-600">Required</span>
        </label>
      </div>

      {(field.type === 'text' || field.type === 'textarea') && (
        <div>
          <label className="text-xs font-medium text-gray-600">Placeholder</label>
          <input type="text" value={field.placeholder ?? ''} onChange={e => onChange({ ...field, placeholder: e.target.value })}
            className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      )}

      {field.type === 'currency' && (
        <div>
          <label className="text-xs font-medium text-gray-600">Currency code</label>
          <input type="text" value={field.currency_code ?? 'USD'} onChange={e => onChange({ ...field, currency_code: e.target.value })}
            className="w-24 mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase" />
        </div>
      )}

      {field.type === 'calculated' && (
        <div>
          <label className="text-xs font-medium text-gray-600">Formula <span className="text-gray-400 font-normal">(e.g. {'{field_a}'} + {'{field_b}'})</span></label>
          <input type="text" value={field.formula ?? ''} onChange={e => onChange({ ...field, formula: e.target.value })}
            className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
        </div>
      )}

      {hasOptions && (
        <div>
          <label className="text-xs font-medium text-gray-600">Options</label>
          <div className="flex flex-wrap gap-1 mt-1 mb-2">
            {(field.options ?? []).map((o, i) => (
              <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-white text-xs rounded-full border border-gray-200">
                {o}
                <button onClick={() => onChange({ ...field, options: field.options?.filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={optionInput} onChange={e => setOptionInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && optionInput.trim()) { onChange({ ...field, options: [...(field.options ?? []), optionInput.trim()] }); setOptionInput(''); e.preventDefault(); } }}
              placeholder="Add option then press Enter" className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={() => { if (optionInput.trim()) { onChange({ ...field, options: [...(field.options ?? []), optionInput.trim()] }); setOptionInput(''); } }}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm">Add</button>
          </div>
        </div>
      )}

      {field.type === 'matrix' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Rows</label>
            <div className="space-y-1 mt-1 mb-1">
              {(field.rows ?? []).map((r, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="flex-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 px-2 py-1 rounded">{r}</span>
                  <button onClick={() => onChange({ ...field, rows: (field.rows ?? []).filter((_, j) => j !== i) })} className="text-gray-300 hover:text-red-400"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-1">
              <input type="text" value={rowInput} onChange={e => setRowInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && rowInput.trim()) { onChange({ ...field, rows: [...(field.rows ?? []), rowInput.trim()] }); setRowInput(''); e.preventDefault(); } }}
                placeholder="Add row" className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <button onClick={() => { if (rowInput.trim()) { onChange({ ...field, rows: [...(field.rows ?? []), rowInput.trim()] }); setRowInput(''); } }} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">+</button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Columns</label>
            <div className="space-y-1 mt-1 mb-1">
              {(field.columns ?? []).map((c, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="flex-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 px-2 py-1 rounded">{c}</span>
                  <button onClick={() => onChange({ ...field, columns: (field.columns ?? []).filter((_, j) => j !== i) })} className="text-gray-300 hover:text-red-400"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-1">
              <input type="text" value={colInput} onChange={e => setColInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && colInput.trim()) { onChange({ ...field, columns: [...(field.columns ?? []), colInput.trim()] }); setColInput(''); e.preventDefault(); } }}
                placeholder="Add column" className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <button onClick={() => { if (colInput.trim()) { onChange({ ...field, columns: [...(field.columns ?? []), colInput.trim()] }); setColInput(''); } }} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">+</button>
            </div>
          </div>
        </div>
      )}

      {(field.type === 'number' || field.type === 'decimal') && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-gray-600">Min</label>
            <input type="number" value={field.min_value ?? ''} onChange={e => onChange({ ...field, min_value: e.target.value ? +e.target.value : undefined })}
              className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Max</label>
            <input type="number" value={field.max_value ?? ''} onChange={e => onChange({ ...field, max_value: e.target.value ? +e.target.value : undefined })}
              className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      )}

      <div>
        <label className="text-xs font-medium text-gray-600">Help text</label>
        <input type="text" value={field.help_text ?? ''} onChange={e => onChange({ ...field, help_text: e.target.value })}
          placeholder="Guidance shown to field agents"
          className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
    </div>
  );
}

function LogicBuilder({ fields, logic, onChange }: {
  fields: FormField[];
  logic: LogicRule[];
  onChange: (rules: LogicRule[]) => void;
}) {
  function addRule() {
    const rule: LogicRule = {
      id: `rule_${Date.now()}`,
      trigger_field: fields[0]?.name ?? '',
      operator: 'equals',
      value: '',
      action: 'hide',
      target_fields: [],
    };
    onChange([...logic, rule]);
  }

  function updateRule(i: number, patch: Partial<LogicRule>) {
    const updated = logic.map((r, j) => j === i ? { ...r, ...patch } : r);
    onChange(updated);
  }

  function deleteRule(i: number) {
    onChange(logic.filter((_, j) => j !== i));
  }

  if (fields.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <GitBranch className="w-10 h-10 text-gray-300 mb-3" />
        <div className="text-gray-500 font-medium">Add at least 2 fields to create logic rules</div>
        <div className="text-gray-400 text-sm mt-1">Logic rules control field visibility and branching</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-700">Conditional Logic Rules</div>
          <div className="text-xs text-gray-400 mt-0.5">Rules are evaluated top-down. When a condition is met, the action is applied.</div>
        </div>
        <button onClick={addRule} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700">
          <PlusIcon className="w-4 h-4" /> Add Rule
        </button>
      </div>

      {logic.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm">
          No rules yet. Click "Add Rule" to start.
        </div>
      ) : (
        <div className="space-y-3">
          {logic.map((rule, i) => (
            <div key={rule.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Rule {i + 1}</span>
                <button onClick={() => deleteRule(i)} className="p-1 text-gray-400 hover:text-red-500 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">When field</label>
                  <select value={rule.trigger_field} onChange={e => updateRule(i, { trigger_field: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {fields.map(f => <option key={f.id} value={f.name}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Condition</label>
                  <select value={rule.operator} onChange={e => updateRule(i, { operator: e.target.value as LogicOperator })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {LOGIC_OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Value</label>
                  {!['is_empty', 'is_not_empty'].includes(rule.operator) && (
                    <input type="text" value={String(rule.value ?? '')} onChange={e => updateRule(i, { value: e.target.value })}
                      placeholder="Value..."
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 items-start">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Then action</label>
                  <select value={rule.action} onChange={e => updateRule(i, { action: e.target.value as LogicAction })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {LOGIC_ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </div>
                {!['jump_to_section', 'end_survey'].includes(rule.action) && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Target fields</label>
                    <select multiple value={rule.target_fields ?? []}
                      onChange={e => updateRule(i, { target_fields: Array.from(e.target.selectedOptions, o => o.value) })}
                      className="w-full px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20">
                      {fields.filter(f => f.name !== rule.trigger_field).map(f => (
                        <option key={f.id} value={f.name}>{f.label}</option>
                      ))}
                    </select>
                    <div className="text-xs text-gray-400 mt-0.5">Hold Ctrl/Cmd to select multiple</div>
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

export function FormsEnginePage() {
  const { org } = useOrg();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'builder'>('list');
  const [editTarget, setEditTarget] = useState<FormTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FormTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'build' | 'preview' | 'logic'>('build');

  const [bName, setBName] = useState('');
  const [bDesc, setBDesc] = useState('');
  const [bFields, setBFields] = useState<FormField[]>([]);
  const [bLogic, setBLogic] = useState<LogicRule[]>([]);
  const [bStatus, setBStatus] = useState<'draft' | 'published'>('draft');
  const [saving, setSaving] = useState(false);

  // Group field types for palette
  const paletteGroups = Array.from(new Set(FIELD_TYPES.map(f => f.group)));

  const load = useCallback(async () => {
    if (!org) return;
    const { data } = await supabase.from('form_templates').select('*').eq('organization_id', org.id).order('created_at', { ascending: false });
    setTemplates((data ?? []) as FormTemplate[]);
    setLoading(false);
  }, [org]);

  useEffect(() => { load(); }, [load]);

  function openBuilder(template?: FormTemplate) {
    if (template) {
      setEditTarget(template);
      setBName(template.name);
      setBDesc(template.description ?? '');
      setBFields(template.schema.fields ?? []);
      setBLogic((template.schema.logic as unknown as LogicRule[]) ?? []);
      setBStatus(template.status as 'draft' | 'published');
    } else {
      setEditTarget(null);
      setBName('');
      setBDesc('');
      setBFields([]);
      setBLogic([]);
      setBStatus('draft');
    }
    setActiveTab('build');
    setView('builder');
  }

  function addField(type: FormFieldType) {
    const id = `field_${Date.now()}`;
    const label = FIELD_TYPES.find(t => t.type === type)?.label ?? type;
    const field: FormField = { id, type, label, name: `f_${id.slice(-6)}`, required: false };
    setBFields(p => [...p, field]);
  }

  function updateField(i: number, f: FormField) {
    setBFields(p => { const n = [...p]; n[i] = f; return n; });
  }

  function removeField(i: number) {
    setBFields(p => p.filter((_, j) => j !== i));
  }

  function moveField(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= bFields.length) return;
    const n = [...bFields];
    [n[i], n[j]] = [n[j], n[i]];
    setBFields(n);
  }

  async function handleSave(publish = false) {
    if (!org || !user) return;
    setSaving(true);
    const status = publish ? 'published' : bStatus;
    const schema = { fields: bFields, logic: bLogic as unknown as import('../../types').FormLogic[], groups: [] };
    const payload = {
      organization_id: org.id,
      name: bName,
      description: bDesc || null,
      schema,
      status,
      version: editTarget ? editTarget.version + (publish ? 1 : 0) : 1,
      created_by: user.id,
    };
    if (editTarget) {
      await supabase.from('form_templates').update(payload).eq('id', editTarget.id);
    } else {
      await supabase.from('form_templates').insert(payload);
    }
    setSaving(false);
    setView('list');
    await load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await supabase.from('form_templates').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    await load();
  }

  if (view === 'builder') {
    return (
      <div className="h-[calc(100vh-7rem)] flex flex-col">
        <PageHeader
          title={editTarget ? `Edit: ${editTarget.name}` : 'New Form Template'}
          breadcrumb={[{ label: 'Forms' }, { label: editTarget ? 'Edit' : 'Builder' }]}
          actions={
            <div className="flex items-center gap-3">
              <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                {(['build', 'logic', 'preview'] as const).map(t => (
                  <button key={t} onClick={() => setActiveTab(t)}
                    className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${activeTab === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                    {t === 'logic' ? 'Logic' : t === 'build' ? 'Build' : 'Preview'}
                  </button>
                ))}
              </div>
              <button onClick={() => setView('list')} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleSave(false)} disabled={saving || !bName} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">Save Draft</button>
              <button onClick={() => handleSave(true)} disabled={saving || !bName}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50">
                <Send className="w-4 h-4" /> Publish
              </button>
            </div>
          }
        />

        <div className="flex gap-6 flex-1 overflow-hidden">
          {activeTab === 'build' ? (
            <>
              {/* Field palette */}
              <div className="w-56 flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 overflow-y-auto">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Add Field</div>
                {paletteGroups.map(group => (
                  <div key={group} className="mb-4">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 px-1">{group}</div>
                    {FIELD_TYPES.filter(f => f.group === group).map(({ type, label, icon: Icon }) => (
                      <button key={type} onClick={() => addField(type)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors">
                        <Icon className="w-4 h-4 flex-shrink-0 text-gray-400" />
                        {label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>

              {/* Canvas */}
              <div className="flex-1 overflow-y-auto">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="mb-6 pb-4 border-b border-gray-100">
                    <input type="text" value={bName} onChange={e => setBName(e.target.value)}
                      placeholder="Form name..."
                      className="w-full text-xl font-bold text-gray-900 placeholder-gray-300 border-none outline-none bg-transparent" />
                    <input type="text" value={bDesc} onChange={e => setBDesc(e.target.value)}
                      placeholder="Description (optional)"
                      className="w-full text-sm text-gray-500 placeholder-gray-300 border-none outline-none bg-transparent mt-1" />
                  </div>
                  {bFields.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                      <FileText className="w-10 h-10 text-gray-300 mb-3" />
                      <div className="text-gray-500 font-medium">Click a field type to add it</div>
                      <div className="text-gray-400 text-sm mt-1">Build your form from the left palette</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bFields.map((field, i) => (
                        <FieldEditor key={field.id} field={field}
                          onChange={f => updateField(i, f)}
                          onDelete={() => removeField(i)}
                          onMoveUp={() => moveField(i, -1)}
                          onMoveDown={() => moveField(i, 1)} />
                      ))}
                      <button onClick={() => setActiveTab('logic')}
                        className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-2">
                        <GitBranch className="w-4 h-4" /> Add conditional logic
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : activeTab === 'logic' ? (
            <div className="flex-1 overflow-y-auto">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <LogicBuilder fields={bFields} logic={bLogic} onChange={setBLogic} />
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-lg mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">{bName || 'Untitled Form'}</h2>
                {bDesc && <p className="text-sm text-gray-500 mb-4">{bDesc}</p>}
                {bLogic.length > 0 && (
                  <div className="mb-4 p-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-600 flex items-center gap-2">
                    <GitBranch className="w-3.5 h-3.5" /> {bLogic.length} logic rule{bLogic.length !== 1 ? 's' : ''} active
                  </div>
                )}
                <div className="space-y-4">
                  {bFields.map(field => <FieldPreview key={field.id} field={field} />)}
                </div>
                {bFields.length > 0 && (
                  <button className="w-full mt-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700">Submit Form</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Forms Engine"
        subtitle="Build intelligent data collection forms with conditional logic"
        actions={
          <button onClick={() => openBuilder()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> New Form
          </button>
        }
      />

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <EmptyState icon={<FileText className="w-6 h-6" />} title="No forms yet"
            description="Create intelligent data collection forms for field agents"
            action={<button onClick={() => openBuilder()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl"><Plus className="w-4 h-4" />New Form</button>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => (
            <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <StatusBadge status={t.status} />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{t.name}</h3>
              {t.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{t.description}</p>}
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                <span>{t.schema.fields?.length ?? 0} fields</span>
                <span>·</span>
                <span>v{t.version}</span>
                {(t.schema.logic?.length ?? 0) > 0 && (
                  <><span>·</span><span className="text-blue-500 flex items-center gap-0.5"><GitBranch className="w-3 h-3" />{t.schema.logic.length} rules</span></>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openBuilder(t)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex-1 justify-center">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => setDeleteTarget(t)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-200 rounded-xl transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Form Template"
        footer={<div className="flex justify-end gap-3"><button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button><button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-600 text-white font-semibold rounded-xl">Delete</button></div>}
      >
        <div className="flex items-start gap-3 text-sm text-gray-600">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          Delete <strong>&nbsp;{deleteTarget?.name}</strong>? Existing submissions will be preserved but no new submissions can be collected.
        </div>
      </Modal>
    </div>
  );
}

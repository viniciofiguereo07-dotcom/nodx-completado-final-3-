import { useMemo } from 'react';
import type { FormField, FormSchema, LogicAction, LogicRule } from '../types';

interface VisibilityState {
  [fieldIdOrSectionId: string]: boolean;
}

type FieldValues = Record<string, unknown>;

function evaluateCondition(
  fieldValue: unknown,
  operator: string,
  ruleValue: unknown
): boolean {
  switch (operator) {
    case 'equals':      return fieldValue === ruleValue;
    case 'not_equals':  return fieldValue !== ruleValue;
    case 'greater_than': return Number(fieldValue) > Number(ruleValue);
    case 'less_than':   return Number(fieldValue) < Number(ruleValue);
    case 'contains':    return String(fieldValue ?? '').toLowerCase().includes(String(ruleValue).toLowerCase());
    case 'not_contains': return !String(fieldValue ?? '').toLowerCase().includes(String(ruleValue).toLowerCase());
    case 'is_empty':    return fieldValue === null || fieldValue === undefined || fieldValue === '';
    case 'is_not_empty': return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
    case 'in':          return Array.isArray(ruleValue) && ruleValue.includes(fieldValue);
    case 'not_in':      return Array.isArray(ruleValue) && !ruleValue.includes(fieldValue);
    default:            return true;
  }
}

// Safe formula evaluator — replaces {field_name} tokens, no eval()
export function evaluateFormula(formula: string, values: FieldValues): number | string {
  const substituted = formula.replace(/\{(\w+)\}/g, (_, name) => {
    const v = values[name];
    return v !== null && v !== undefined ? String(v) : '0';
  });
  try {
    // Only allow safe math expressions
    if (/^[\d\s+\-*/().]+$/.test(substituted)) {
      // eslint-disable-next-line no-new-func
      return Function(`"use strict"; return (${substituted})`)() as number;
    }
    return substituted;
  } catch {
    return 0;
  }
}

export function useFormLogic(schema: FormSchema, values: FieldValues): {
  visibility: VisibilityState;
  isFieldVisible: (fieldId: string) => boolean;
  isSectionVisible: (sectionId: string) => boolean;
  computedValues: FieldValues;
} {
  const visibility = useMemo<VisibilityState>(() => {
    const state: VisibilityState = {};

    // Default: all visible
    schema.fields.forEach(f => { state[f.id] = true; });
    schema.groups?.forEach(g => { state[g.id] = true; });

    // Apply logic rules
    for (const rawRule of (schema.logic ?? [])) {
      const rule = rawRule as import('../types').LogicRule;
      if (!rule.trigger_field) continue;
      const triggerValue = values[rule.trigger_field];
      const conditionMet = evaluateCondition(triggerValue, rule.operator as string, rule.value);

      const apply = (id: string, action: LogicAction) => {
        if (action === 'show')       state[id] = true;
        if (action === 'hide')       state[id] = false;
        if (action === 'end_survey') state[id] = false;
      };

      if (conditionMet) {
        rule.target_fields?.forEach((id: string) => apply(id, rule.action));
        rule.target_sections?.forEach((id: string) => apply(id, rule.action));
      }
    }

    return state;
  }, [schema, values]);

  // Compute calculated field values
  const computedValues = useMemo<FieldValues>(() => {
    const computed: FieldValues = {};
    function processFields(fields: FormField[]) {
      for (const field of fields) {
        if (field.type === 'calculated' && field.formula) {
          computed[field.name] = evaluateFormula(field.formula, { ...values, ...computed });
        }
        if (field.fields) processFields(field.fields);
      }
    }
    processFields(schema.fields);
    return computed;
  }, [schema.fields, values]);

  return {
    visibility,
    isFieldVisible: (id: string) => visibility[id] !== false,
    isSectionVisible: (id: string) => visibility[id] !== false,
    computedValues,
  };
}

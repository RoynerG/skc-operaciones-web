export type FieldType = 'text' | 'email' | 'tel' | 'url' | 'number' | 'date' | 'time' | 'textarea' | 'select' | 'radio' | 'checkbox';

export interface Option { label: string; value: string }
export interface FormField {
  id: string;
  type: FieldType;
  name: string;
  label: string;
  description: string;
  placeholder: string;
  required: boolean;
  options: Option[];
}
export interface FormSection { id: string; title: string; description: string; fields: FormField[] }
export type FormAction =
  | { id: string; type: 'webhook'; enabled: boolean; url: string; method: 'POST' | 'PUT' | 'PATCH'; secret: string }
  | { id: string; type: 'server_function'; enabled: boolean; functionName: string };

export interface Endpoints { schema: string; submit: string; drafts: string; submissions?: string }
export interface FormDefinition {
  id?: number;
  slug: string;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'archived';
  version: number;
  submitLabel: string;
  successMessage: string;
  redirectUrl: string;
  draftTtlDays: number;
  sections: FormSection[];
  actions?: FormAction[];
  endpoints?: Endpoints;
  createdAt?: string;
  updatedAt?: string;
}

export interface FormSummary {
  id: number; slug: string; title: string; description: string; status: FormDefinition['status'];
  version: number; submissions: number; createdAt: string; updatedAt: string; endpoints: Endpoints;
}
export interface User { id: number; username?: string; name: string; email: string; role: string }
export interface Submission { id: number; status: string; values: Record<string, unknown>; actions: Array<Record<string, unknown>>; createdAt: string }

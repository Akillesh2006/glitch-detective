export type SupportedLanguage = 'python' | 'java';

export interface AnalyzeRequest {
  language: SupportedLanguage;
  code: string;
  error_message?: string;
}

export interface AnalyzeResponse {
  status: string;
  is_placeholder: boolean;
  language: string;
  root_cause: string;
  relevant_evidence: string[];
  suggested_fix: string;
  practice_question: string;
  disclaimer: string;
  submitted_code_preview: string;
  submitted_error_preview?: string | null;
  error_category?: string | null;
  title?: string | null;
  line_number?: number | null;
  column_offset?: number | null;
  fix_explanation?: string | null;
  expected_output?: string | null;
  hint?: string | null;
  real_world_analogy?: string | null;
  actionable_summary?: string | null;
  confidence?: string | null;
}

export interface HealthResponse {
  status: string;
  app_name: string;
  version: string;
  tagline: string;
  supported_languages: string[];
}

export type SubmissionStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'empty_input'
  | 'connection_error';

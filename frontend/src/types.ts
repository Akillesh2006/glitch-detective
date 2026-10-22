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

export type AppMode = 'code' | 'detective';

export interface ChallengeSummary {
  id: string;
  title: string;
  language: SupportedLanguage;
  difficulty: string;
  category: string;
  scenario: string;
}

export interface ChallengeDetail {
  id: string;
  title: string;
  language: SupportedLanguage;
  difficulty: string;
  category: string;
  scenario: string;
  buggy_code: string;
  expected_behavior: string;
  total_hints: number;
  unlocked_hints: string[];
  hint_level: number;
}

export interface VerifyChallengeResponse {
  challenge_id: string;
  status: 'correct' | 'incorrect' | 'ambiguous';
  passed: boolean;
  message: string;
  feedback: string;
  details?: string | null;
}

export interface ChallengeSolutionResponse {
  challenge_id: string;
  title: string;
  canonical_solution: string;
  bug_explanation: string;
  fix_rationale: string;
  real_world_analogy?: string | null;
}



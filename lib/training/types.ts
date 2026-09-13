import type { Membership } from '@/lib/auth';
export type Roster = Membership & {
  active: boolean;
  user_id: string | null;
  created_at: string;
  manager_id: string | null;
};
export type Module = {
  id: string;
  tenant_id: string;
  track_id: string;
  slug: string;
  title: string;
  position: number;
};
export type Progress = {
  id: string;
  module_id: string;
  roster_id: string;
  status: string;
  exam_passed: boolean;
  freetext_passed: boolean;
  diagram_passed: boolean;
  last_activity_at: string;
  passed_at: string | null;
};
export type Attempt = {
  id: string;
  quiz_id: string;
  module_id: string;
  roster_id: string;
  question_ids: string[];
  score_percent: number | null;
  passed: boolean;
  completed_at: string | null;
  started_at: string;
};
export type FreeAttempt = {
  id: string;
  module_id: string;
  passed: boolean;
  answer: string;
  feedback: string;
  created_at: string;
};
export type QuestionRow = {
  id: string;
  slug: string;
  quiz_id: string;
  module_id: string;
  prompt: string;
  kind: string;
  options: string[];
  correct_answer: number;
  rubric: unknown;
};
export type QuizRow = {
  id: string;
  module_id: string;
  slug: string;
  kind: string;
  lesson_id: string | null;
};
export type FormRow = {
  id: string;
  module_id: string;
  type: string;
  passed: boolean;
  completed_at: string | null;
  responses: Record<string, unknown>;
  notes: string;
};
export type SimRow = {
  id: string;
  roster_id: string;
  tenant_id: string;
  tier: 'warm' | 'standard' | 'hard';
  status: string;
  turn_count: number;
  started_at: string;
  ended_at: string | null;
};
export type GradeRow = {
  sim_run_id: string;
  passed: boolean;
  total_score: number;
  grade: import('@/lib/sim/schema').Grade;
};

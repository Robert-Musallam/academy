import 'server-only';
import { rows, rpc } from './db';
import { trainingPath, type ProgressEvidence } from '@/lib/progress';
import type {
  Roster,
  Module,
  Progress,
  SimRow,
  GradeRow,
  FormRow,
} from './types';
export async function overview(member: Roster) {
  const [modules, progress, runs, grades, forms] = await Promise.all([
    rows<Module>('modules', {
      tenant_id: member.tenant_id,
      track_id: member.track_id,
    }),
    rows<Progress>('module_progress', {
      roster_id: member.id,
      tenant_id: member.tenant_id,
    }),
    rows<SimRow>('sim_runs', {
      roster_id: member.id,
      tenant_id: member.tenant_id,
    }),
    rows<GradeRow>('sim_grades', {
      roster_id: member.id,
      tenant_id: member.tenant_id,
    }),
    rows<FormRow>('manager_forms', {
      roster_id: member.id,
      tenant_id: member.tenant_id,
    }),
  ]);
  const evidence: ProgressEvidence = {
    courses: {},
    passingSimTiers: runs
      .filter((r) => grades.some((g) => g.sim_run_id === r.id && g.passed))
      .map((r) => r.tier),
    field: {
      rideAlongCompleted: forms.some(
        (f) => f.type === 'ride_along' && !!f.completed_at,
      ),
      day5Passed: forms.some((f) => f.type === 'day5_eval' && f.passed),
      hcpCompleted: forms.some((f) => f.type === 'hcp_exercise' && f.passed),
    },
  };
  modules.forEach((m) => {
    const p = progress.find((p) => p.module_id === m.id);
    evidence.courses[m.position] = {
      examScores: p?.exam_passed ? [100] : [],
      freeTextPassed: !!p?.freetext_passed,
      diagramPassed: p?.diagram_passed,
    };
  });
  const path = trainingPath(evidence);
  return {
    modules: modules
      .sort((a, b) => a.position - b.position)
      .map((m) => ({ ...m, status: path[m.position - 1].status })),
    progress,
    runs,
    grades,
    forms,
  };
}
export async function allowed(member: Roster, slug: string) {
  const state = await overview(member);
  const module = state.modules.find((m) => m.slug === slug);
  if (!module || module.status === 'locked')
    throw new Error('Complete the previous module first');
  return module;
}
export async function touch(
  member: Roster,
  moduleId: string,
  flags: { exam?: boolean; freetext?: boolean; diagram?: boolean } = {},
) {
  await rpc('academy_progress', {
    p_owner: member.id,
    p_module: moduleId,
    p_flags: flags,
  });
  const state = await overview(member);
  for (const m of state.modules)
    if (m.status === 'passed')
      await rpc('academy_progress', {
        p_owner: member.id,
        p_module: m.id,
        p_flags: { passed: true },
      });
}

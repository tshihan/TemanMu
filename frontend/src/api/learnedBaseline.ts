import a105Outing from '../../../shared/ml/A-105_outing.json'
import a105QuietGap from '../../../shared/ml/A-105_quiet_gap.json'
import type { LearnedLimit } from './types'

/** Mirrors backend/app/learned_baseline.py: baselines from the trained models, not typed in. */
type ModelFile = { unit_id: string; slot_minutes: number; model: { name: string }; trained_on: { days: number }; limits_minutes: Record<string, number[]> }
const MODELS: Record<string, ModelFile> = {
  'ml/A-105_quiet_gap.json': a105QuietGap,
  'ml/A-105_outing.json': a105Outing,
}
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const SCENE_DAY = DAYS[0]

type SeedLearned = { model_file: string; scene_time: string; story_minutes_per_demo_second: number }
type SeedBaseline = {
  usual_quiet_gap_seconds?: number; learned_quiet_gap?: SeedLearned
  usual_outing_seconds?: number; learned_outing?: SeedLearned
}
type Resolved = { seconds: number; learned: LearnedLimit | null }

function resolve(typedIn: number | undefined, cfg: SeedLearned | undefined): Resolved {
  if (!cfg) return { seconds: typedIn ?? 0, learned: null }
  const model = MODELS[cfg.model_file]
  const [hh, mm] = cfg.scene_time.split(':').map(Number)
  const storyMinutes = model.limits_minutes[SCENE_DAY][Math.floor((hh * 60 + mm) / model.slot_minutes)]
  return {
    seconds: Math.max(1, Math.round(storyMinutes / cfg.story_minutes_per_demo_second)),
    learned: {
      story_minutes: storyMinutes, scene_time: cfg.scene_time,
      story_minutes_per_demo_second: cfg.story_minutes_per_demo_second,
      model: model.model.name, trained_days: model.trained_on.days, source: 'simulated_history',
    },
  }
}

/** (demo seconds, how it was learned) for a seed baseline; typed-in values pass through. */
export const resolveQuietGap = (baseline: SeedBaseline) => resolve(baseline.usual_quiet_gap_seconds, baseline.learned_quiet_gap)
export const resolveOuting = (baseline: SeedBaseline) => resolve(baseline.usual_outing_seconds, baseline.learned_outing)

/** The resident's learned quiet gap for each hour of the day (minutes), for the routine chart. */
export function learnedDay(unitId: string): number[] | null {
  const model = a105QuietGap.unit_id === unitId ? a105QuietGap : null
  if (!model) return null
  const perHour = 60 / model.slot_minutes
  return Array.from({ length: 24 }, (_, hour) => model.limits_minutes[SCENE_DAY][hour * perHour])
}

export type UsualOuting = (typeof a105Outing.usual_outings)[number]
/** Her regular tap-out times with usual length and alert limit, for the outings card. */
export const usualOutings = (unitId: string): UsualOuting[] | null => a105Outing.unit_id === unitId ? a105Outing.usual_outings : null

/** 120 -> "2h 00m" */
export const storyDuration = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(Math.round(minutes) % 60).padStart(2, '0')}m`

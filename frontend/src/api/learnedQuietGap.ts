import a105Model from '../../../shared/ml/A-105_quiet_gap.json'
import type { LearnedQuietGap } from './types'

/** Mirrors backend/app/learned_baseline.py: a quiet gap from the Quiet Gap Model, not typed in. */
const MODELS: Record<string, typeof a105Model> = { 'ml/A-105_quiet_gap.json': a105Model }
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const SCENE_DAY = DAYS[0]

type SeedQuietGap = {
  usual_quiet_gap_seconds?: number
  learned_quiet_gap?: { model_file: string; scene_time: string; story_minutes_per_demo_second: number }
}

/** (demo seconds, how it was learned) for a seed baseline; typed-in values pass through. */
export function resolveQuietGap(baseline: SeedQuietGap): { seconds: number; learned: LearnedQuietGap | null } {
  const cfg = baseline.learned_quiet_gap
  if (!cfg) return { seconds: baseline.usual_quiet_gap_seconds ?? 0, learned: null }
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

/** The resident's learned limit for each hour of the day (minutes), for the routine chart. */
export function learnedDay(unitId: string): number[] | null {
  const model = Object.values(MODELS).find(item => item.unit_id === unitId)
  if (!model) return null
  const perHour = 60 / model.slot_minutes
  return Array.from({ length: 24 }, (_, hour) => model.limits_minutes[SCENE_DAY][hour * perHour])
}

/** 115 -> "1h 55m" */
export const storyDuration = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(Math.round(minutes) % 60).padStart(2, '0')}m`

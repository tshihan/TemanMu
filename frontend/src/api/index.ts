import { liveApi } from './live'
import { mockApi } from '../mocks/api'

// Start independently of Supabase/backend; set VITE_USE_MOCK=false to integrate live.
export const usingMock = import.meta.env.VITE_USE_MOCK !== 'false'
export const api = usingMock ? mockApi : liveApi
export type * from './types'

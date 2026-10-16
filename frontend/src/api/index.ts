import { liveApi } from './live'
import { sharedMockApi } from '../mocks/shared-client'

// Start independently of Supabase/backend; set VITE_USE_MOCK=false to integrate live.
export const usingMock = import.meta.env.VITE_USE_MOCK !== 'false'
export const api = usingMock ? sharedMockApi : liveApi
export type * from './types'

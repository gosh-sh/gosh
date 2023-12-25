import { Session } from '@supabase/supabase-js'

export type TOAuthSession = {
  session: Session | null
  isLoading: boolean
  error?: string | object
}

import {
    createClient,
    SupabaseClientOptions,
} from 'https://esm.sh/@supabase/supabase-js@2.1.3'
export type { User } from 'https://esm.sh/@supabase/supabase-js@2.1.3'
import type { Database } from './types.ts'

const supabaseUrl = () => Deno.env.get('SUPABASE_URL') ?? ''
const supabaseKey = () => Deno.env.get('SUPABASE_KEY') ?? ''

export const getDb = (options?: SupabaseClientOptions<any>) => {
    return createClient<Database>(supabaseUrl(), supabaseKey(), options)
}

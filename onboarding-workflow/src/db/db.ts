import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.1.3'
import type { Database } from './types.ts'

const supabaseUrl = () => Deno.env.get('SUPABASE_URL') ?? ''
const supabaseKey = () => Deno.env.get('SUPABASE_KEY') ?? ''

export const getDb = () => {
    return createClient<Database>(supabaseUrl(), supabaseKey())
}

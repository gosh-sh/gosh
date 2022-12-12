import { createClient } from "https://esm.sh/@supabase/supabase-js@2.1.3";

const supabaseUrl = () => Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = () => Deno.env.get("SUPABASE_KEY") ?? "";

export const createSupabaseClient = (schema: string) => {
  const options = {
    db: { schema },
  };
  return createClient(supabaseUrl(), supabaseKey(), options);
};

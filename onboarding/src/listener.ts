import * as dotenv from "https://deno.land/x/dotenv@v3.2.0/mod.ts";
import { createSupabaseClient } from "./utils/db.ts";
import { getQueue } from "./utils/tasks.ts";

dotenv.config({ export: true });

const supabase = createSupabaseClient("public");
const queue = getQueue(false);

const { data, error } = await supabase.from("github").select("*").is(
  "updated_at",
  null,
);

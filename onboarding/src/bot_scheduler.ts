import * as dotenv from "https://deno.land/x/dotenv@v3.2.0/mod.ts";
import { sleep } from "https://deno.land/x/sleep@v1.2.1/mod.ts";
import { createSupabaseClient } from "./utils/db.ts";
import { getEverClient } from "./utils/eversdk.ts";

dotenv.config({ export: true });

const supabase = createSupabaseClient("public");
const everClient = getEverClient();

while (true) {
  const { data: githubs, error } = await supabase
    .from("github")
    .select(`*`)
    .is("dao_bot", null);

  if (error) {
    console.error(error);
  }

  if (githubs) {
    for (const github of githubs) {
      const internal_url = github.gosh_url.split(`//`)[1];
      const [_root, dao_name] = internal_url.split(`/`);

      const { data: dao_bot, error } = await supabase
        .from("dao_bot")
        .select()
        .eq("dao_name", dao_name)
        .single();

      if (!dao_bot) {
        console.log("Create new dao bot...", dao_name);
        const { phrase } = await everClient.crypto.mnemonic_from_random(
          {},
        );
        const keys = await everClient.crypto.mnemonic_derive_sign_keys({
          phrase,
        });

        const { data: dao_bot, error } = await supabase.from("dao_bot")
          .insert({
            dao_name: dao_name,
            seed: phrase,
            pubkey: keys.public,
            secret: keys.secret,
          });
        console.log("Dao bot insert", dao_bot);
      }

      const { data } = await supabase
        .from("github")
        .update({
          dao_bot: dao_bot.id,
        })
        .eq("id", github.id);

      console.log("Update result", data);
    }
  }

  //
  console.log("Sleep...");
  await sleep(30);
}

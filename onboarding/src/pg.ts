import { TonClient } from "@eversdk/core";
import { libNode } from "@eversdk/lib-node";

console.log(process.env.SUPABASE_URL);

TonClient.useBinaryLibrary(libNode);

const client = new TonClient();

// const { phrase } = await client.crypto.mnemonic_from_random({});
// console.log(phrase);

console.log(
  await client.crypto.mnemonic_derive_sign_keys({
    phrase:
      "detect sweet liar crush laptop perfect west globe dismiss wire badge loud",
  }),
);

client.close();

export async function genphrase(): Promise<string | undefined> {
  const p = Deno.run({
    cmd: ["tonos-cli", "--json", "genphrase"],
    stdout: "piped",
  });
  const [_status, stdout] = await Promise.all([p.status(), p.output()]);

  const output = new TextDecoder().decode(stdout);
  const json = JSON.parse(output);
  const { phrase } = json;
  return phrase;
}

type KeyPair = {
  pubkey: string;
  secret: string;
};

export async function genkeypair(seed: string): Promise<KeyPair | undefined> {
  const p = Deno.run({
    cmd: ["tonos-cli", "getkeypair", "-p", seed],
    stdout: "piped",
  });
  const [_status, stdout] = await Promise.all([p.status(), p.output()]);

  const output = new TextDecoder().decode(stdout);
  const match = output.match(/{[\s\S]*}/);

  if (match) {
    const { public: pubkey, secret } = JSON.parse(match[0]);
    return {
      pubkey,
      secret,
    };
  }
}

const seed = (await genphrase()) ?? Deno.exit(1);
console.log("seed", seed);
const pair = await genkeypair(seed);
console.log("keypair", pair);

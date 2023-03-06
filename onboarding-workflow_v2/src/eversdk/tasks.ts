import { getEverClient } from './client.ts'

export async function generateEverWallet() {
    const { phrase } = await getEverClient().crypto.mnemonic_from_random({})
    const keys = await getEverClient().crypto.mnemonic_derive_sign_keys({
        phrase,
    })
    return {
        seed: phrase,
        pubkey: keys.public,
        secret: keys.secret,
    }
}

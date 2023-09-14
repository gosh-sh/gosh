import { TonClient } from 'npm:@eversdk/core'
// @deno-types="../../node_modules/@eversdk/lib-web/index.d.ts"
import { libWeb, libWebSetup } from '../../node_modules/@eversdk/lib-web/index.js'

// https://app.gosh.sh/envs.json
export const SYSTEM_CONTRACT_ADDR = Deno.env.get('SYSTEM_CONTRACT_ADDR') ?? ''
export const GOSH_ENDPOINTS = (Deno.env.get('GOSH_ENDPOINTS') ?? '').split(',')

let everClient: TonClient

export function getEverClient(): TonClient {
    if (!everClient) {
        const binaryURL = new URL(
            '../../node_modules/@eversdk/lib-web/eversdk.wasm',
            import.meta.url,
        ).toString()

        libWebSetup({
            disableSeparateWorker: true,
            binaryURL,
        })

        // deno-lint-ignore no-explicit-any
        TonClient.useBinaryLibrary(libWeb as any)
        everClient = new TonClient()
    }
    return everClient
}

export async function getAccountBoc(addr: string) {
    const result = await getEverClient().net.query_collection({
        collection: 'accounts',
        filter: { id: { eq: addr } },
        result: 'boc',
    })
    console.log('boc result', result)
    return result
}

// const abi = abiSerialized(json_file_content)

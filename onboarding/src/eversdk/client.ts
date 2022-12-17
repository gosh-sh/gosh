import { TonClient } from 'npm:@eversdk/core'
// @deno-types="../../node_modules/@eversdk/lib-web/index.d.ts"
import { libWeb, libWebSetup } from '../../node_modules/@eversdk/lib-web/index.js'

// https://app.gosh.sh/envs.json
export const SYSTEM_CONTRACT_ADDR =
    '0:18fae8e25d9ffea2b0875646398efe00361805b371ce61216a053af161a3a30e'
export const SYSTEM_CONTRACT_ABI = './abi/systemcontract.abi.json'
export const GOSH_DAO_ABI = './abi/goshdao.abi.json'

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

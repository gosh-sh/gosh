import { TonClient } from 'npm:@eversdk/core'
// @deno-types="../../node_modules/@eversdk/lib-web/index.d.ts"
import { libWeb, libWebSetup } from '../../node_modules/@eversdk/lib-web/index.js'

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

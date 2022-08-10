import { TonClient, BinaryLibrary } from '@eversdk/core'
import { libWeb } from '@eversdk/lib-web'

// eslint-disable-next-line react-hooks/rules-of-hooks
TonClient.useBinaryLibrary(() => {
    const promise = libWeb()
    return promise as unknown as Promise<BinaryLibrary>
})

export * from './helpers'
export * from './utils'
export * from './types'
export * from './store'
export * from './hooks'

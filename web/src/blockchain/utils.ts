import { Buffer } from 'buffer'
import { AppConfig } from '../appconfig'
import { TPaginatedAccountsResult } from '../types/blockchain.types'
import { sleep } from '../utils'
import { KeyPair } from '@eversdk/core'

export const generateRandomBytes = async (
    length: number,
    hex: boolean = false,
): Promise<string> => {
    const result = await AppConfig.goshclient.crypto.generate_random_bytes({ length })
    if (hex) return Buffer.from(result.bytes, 'base64').toString('hex')
    return result.bytes
}

export const chacha20 = {
    async encrypt(data: string, key: string, nonce: string): Promise<string> {
        const result = await AppConfig.goshclient.crypto.chacha20({
            data,
            key: key.padStart(64, '0'),
            nonce,
        })
        return result.data
    },
    async decrypt(data: string, key: string, nonce: string): Promise<string> {
        const result = await AppConfig.goshclient.crypto.chacha20({
            data,
            key: key.padStart(64, '0'),
            nonce,
        })
        return result.data
    },
}

export const zstd = {
    async compress(data: string | Buffer): Promise<string> {
        const uncompressed = Buffer.isBuffer(data)
            ? data.toString('base64')
            : Buffer.from(data).toString('base64')
        const result = await AppConfig.goshclient.utils.compress_zstd({
            uncompressed,
        })
        return result.compressed
    },
    async decompress(data: string, uft8: boolean = true): Promise<string> {
        const result = await AppConfig.goshclient.utils.decompress_zstd({
            compressed: data,
        })
        if (uft8) return Buffer.from(result.decompressed, 'base64').toString()
        return result.decompressed
    },
}

export const goshipfs = {
    async write(content: string, filename?: string): Promise<string> {
        const form = new FormData()
        const blob = new Blob([content])
        form.append('file', blob, filename)

        const response = await fetch(
            `${AppConfig.goshipfs}/api/v0/add?pin=true&quiet=true`,
            {
                method: 'POST',
                body: form,
            },
        )

        if (!response.ok) {
            throw new Error(`Error while uploading (${JSON.stringify(response)})`)
        }
        const responseBody = await response.json()
        const { Hash: cid } = responseBody
        return cid
    },
    async read(cid: string): Promise<Buffer> {
        const response = await fetch(`${AppConfig.goshipfs}/ipfs/${cid.toString()}`, {
            method: 'GET',
        })

        if (!response.ok) {
            throw new Error(`Error while uploading (${JSON.stringify(response)})`)
        }
        return Buffer.from(await response.arrayBuffer())
    },
}

export const getPaginatedAccounts = async (params: {
    filters?: string[]
    result?: string[]
    limit?: number
    lastId?: string
}): Promise<TPaginatedAccountsResult> => {
    const { filters = [], result = [], limit = 10, lastId } = params
    const query = `query AccountsQuery( $lastId: String, $limit: Int) {
        accounts(
            filter: {
                id: { gt: $lastId },
                ${filters.join(',')}
            }
            orderBy: [
                { path: "id", direction: ASC },
            ]
            limit: $limit
        ) {
            id ${result.join(' ')}
        }
    }`
    const response = await AppConfig.goshclient.net.query({
        query,
        variables: { lastId, limit },
    })
    const results = response.result.data.accounts
    return {
        results,
        lastId: results.length ? results[results.length - 1].id : undefined,
        completed: results.length < limit,
    }
}

export const getAllAccounts = async (params: {
    filters: string[]
    result?: string[]
}): Promise<any[]> => {
    const { filters, result } = params

    let next: string | undefined
    const results = []
    while (true) {
        const accounts = await getPaginatedAccounts({
            filters,
            result,
            limit: 50,
            lastId: next,
        })
        results.push(...accounts.results)
        next = accounts.lastId
        if (accounts.completed) {
            break
        }
        await sleep(200)
    }
    return results
}

export const signData = async (data: string, keys: KeyPair) => {
    return await AppConfig.goshclient.crypto.sign({
        unsigned: Buffer.from(data).toString('base64'),
        keys,
    })
}

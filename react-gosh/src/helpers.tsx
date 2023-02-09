import cryptoJs, { SHA1, SHA256 } from 'crypto-js'
import { Buffer } from 'buffer'
import { sleep } from './utils'
import { AppConfig } from './appconfig'
import { TTreeItem } from './types/repo.types'
import { GoshError } from './errors'
import { TPaginatedAccountsResult } from './types'

export const retry = async (fn: Function, maxAttempts: number) => {
    const delay = (fn: Function, ms: number) => {
        return new Promise((resolve) => setTimeout(() => resolve(fn()), ms))
    }

    const execute = async (attempt: number) => {
        try {
            return await fn()
        } catch (err) {
            const isGoshError = err instanceof GoshError

            if (attempt <= maxAttempts && !isGoshError) {
                const nextAttempt = attempt + 1
                const delayInMs = 2000
                console.error(`Retrying after ${delayInMs} ms due to:`, err)
                return delay(() => execute(nextAttempt), delayInMs)
            } else {
                throw err
            }
        }
    }
    return execute(1)
}

export const getPaginatedAccounts = async (params: {
    filters?: string[]
    result?: string[]
    limit?: number
    lastTransLt?: string
}): Promise<TPaginatedAccountsResult> => {
    const { filters = [], result = [], limit = 10, lastTransLt } = params
    // TODO: fix this (not normal)
    const _params = {
        qVar: lastTransLt ? '$lastTransLt: String' : '$lastPaid: Float',
        filter: lastTransLt
            ? 'last_trans_lt: { lt: $lastTransLt }'
            : 'last_paid: { lt: $lastPaid }',
        orderByPath: lastTransLt ? 'last_trans_lt' : 'last_paid',
        var: lastTransLt ? { lastTransLt, limit } : { lastPaid: Date.now(), limit },
    }

    const query = `query AccountsQuery( ${_params.qVar}, $limit: Int) {
        accounts(
            filter: {
                ${_params.filter},
                ${filters.join(',')}
            }
            orderBy: [{ path: "${_params.orderByPath}", direction: DESC }]
            limit: $limit
        ) {
            id last_trans_lt ${result.join(' ')}
        }
    }`
    const response = await AppConfig.goshclient.net.query({
        query,
        variables: _params.var,
    })
    const results = response.result.data.accounts
    return {
        results,
        lastTransLt: results.length
            ? results[results.length - 1].last_trans_lt
            : undefined,
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
            lastTransLt: next,
        })
        results.push(...accounts.results)
        next = accounts.lastTransLt
        if (accounts.completed) {
            break
        }
        await sleep(200)
    }
    return results
}

export const getCodeLanguageFromFilename = (monaco: any, filename: string): string => {
    let splitted = filename.split('.')
    const ext = `.${splitted.slice(-1)}`
    const found = monaco.languages
        .getLanguages()
        .find((item: any) => item.extensions && item.extensions.indexOf(ext) >= 0)
    return found?.id || 'plaintext'
}

export const sha1 = (
    data: string | Buffer,
    type: 'blob' | 'commit' | 'tree' | 'tag' | 'blobExecutable' | 'link',
    mode: 'sha1' | 'sha256',
): string => {
    if (type === 'blobExecutable') type = 'blob'
    let content = data

    const size = Buffer.isBuffer(content)
        ? content.byteLength
        : Buffer.from(content, 'utf-8').byteLength

    let words = cryptoJs.enc.Utf8.parse(`${type} ${size}\0`)
    words.concat(
        Buffer.isBuffer(content)
            ? cryptoJs.enc.Hex.parse(content.toString('hex'))
            : cryptoJs.enc.Utf8.parse(content),
    )

    let hash
    if (mode === 'sha1') hash = SHA1(words)
    if (mode === 'sha256') hash = SHA256(words)
    if (!hash) throw new Error('Could not calculate hash')
    // const hash = SHA1(words);
    return hash.toString()
}

export const sha256 = (content: string | Buffer, prefix: boolean): string => {
    const hash = SHA256(
        Buffer.isBuffer(content)
            ? cryptoJs.enc.Hex.parse(content.toString('hex'))
            : cryptoJs.enc.Utf8.parse(content),
    ).toString()

    if (prefix) return `0x${hash}`
    return hash
}

export const sha1Tree = (items: TTreeItem[], mode: 'sha1' | 'sha256') => {
    const buffer = Buffer.concat(
        items
            //@ts-ignore
            .sort((a: any, b: any) => (a.name > b.name) - (a.name < b.name))
            .map((i) =>
                Buffer.concat([
                    Buffer.from(`${i.mode === '040000' ? '40000' : i.mode} ${i.name}\0`),
                    Buffer.from(i.sha1, 'hex'),
                ]),
            ),
    )
    return sha1(buffer, 'tree', mode)
}

/** Split file path to path and file name */
export const splitByPath = (fullPath: string): [path: string, name: string] => {
    const lastSlashIndex = fullPath.lastIndexOf('/')
    const path = lastSlashIndex >= 0 ? fullPath.slice(0, lastSlashIndex) : ''
    const name = lastSlashIndex >= 0 ? fullPath.slice(lastSlashIndex + 1) : fullPath
    return [path, name]
}

export const unixtimeWithTz = (): string => {
    const pad = (num: number): string => (num < 10 ? '0' : '') + num
    const unixtime = Math.floor(Date.now() / 1000)
    const tzo = -new Date().getTimezoneOffset()
    const dif = tzo >= 0 ? '+' : '-'
    return [
        `${unixtime} ${dif}`,
        pad(Math.floor(Math.abs(tzo) / 60)),
        pad(Math.abs(tzo) % 60),
    ].join('')
}

export const getCommitTime = (str: string): Date => {
    const [unixtime] = str.split(' ').slice(-2)
    return new Date(+unixtime * 1000)
}

export const generateRandomBytes = async (
    length: number,
    hex: boolean = false,
): Promise<string> => {
    const result = await AppConfig.goshclient.crypto.generate_random_bytes({ length })
    if (hex) return Buffer.from(result.bytes, 'base64').toString('hex')
    return result.bytes
}

export const getTreeItemFullPath = (item: TTreeItem): string => {
    const path = item.path ? `${item.path}/` : ''
    return `${path}${item.name}`
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

export const splitByChunk = <T,>(array: T[], chunkSize: number = 10): T[][] => {
    const chunks = []
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
}

export const executeByChunk = async <Input, Output>(
    array: Input[],
    chunkSize: number,
    executor: (params: Input, index: number) => Promise<Output>,
): Promise<Output[]> => {
    const result: Output[] = []
    const chunks = splitByChunk(array, chunkSize)
    for (const [index, chunk] of chunks.entries()) {
        const part = await Promise.all(
            chunk.map(async (params, i) => await executor(params, index * chunkSize + i)),
        )
        result.push(...part)
        await sleep(300)
    }
    return result
}

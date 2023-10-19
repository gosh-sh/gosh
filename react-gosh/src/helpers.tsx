import cryptoJs, { SHA1, SHA256 } from 'crypto-js'
import { Buffer } from 'buffer'
import { sleep } from './utils'
import { AppConfig } from './appconfig'
import { GoshError } from './errors'
import { TAddress, TTreeItem, TPaginatedAccountsResult } from './types'
import { GoshAdapterFactory } from './gosh'
import { Abi, DecodedMessageBody, KeyPair, abiJson } from '@eversdk/core'

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

export const getRepositoryAccounts = async (
    dao: string,
    options: { version?: string },
) => {
    const { version } = options
    const versions = Object.keys(AppConfig.versions).reverse()
    const items: { address: TAddress; last_paid: number; version: string }[] = []
    for (const ver of versions) {
        if (version && ver !== version) {
            continue
        }

        const gosh = GoshAdapterFactory.create(ver)
        const daoAdapter = await gosh.getDao({ name: dao, useAuth: false })
        if (!(await daoAdapter.isDeployed())) {
            continue
        }

        const codeHash = await gosh.getRepositoryCodeHash(daoAdapter.getAddress())
        const result = await getAllAccounts({
            filters: [`code_hash: {eq:"${codeHash}"}`],
            result: ['last_paid'],
        })
        items.push(
            ...result.map(({ id, last_paid }) => ({
                address: id,
                last_paid,
                version: ver,
            })),
        )
    }
    return items
}

export const getMessages = async (
    variables: {
        address: string
        msgType: string[]
        node?: string[]
        cursor?: string | undefined
        limit?: number | undefined
        allow_latest_inconsistent_data?: boolean
    },
    abi?: Abi,
    all?: boolean,
    messages?: any[],
): Promise<{ cursor?: string; messages: any[]; hasNext?: boolean }> => {
    const {
        address,
        msgType,
        node = [],
        cursor,
        limit = 50,
        allow_latest_inconsistent_data = false,
    } = variables

    const result = ['id', 'msg_type', 'created_lt', 'body', ...node]
    messages = messages ?? []
    all = all ?? false

    const query = `query MessagesQuery(
        $address: String!,
        $msgType: [BlockchainMessageTypeFilterEnum!],
        $cursor: String,
        $limit: Int
        $allow_latest_inconsistent_data: Boolean
    ) {
        blockchain {
            account(address: $address) {
                messages(
                    msg_type: $msgType,
                    last: $limit,
                    before: $cursor,
                    allow_latest_inconsistent_data: $allow_latest_inconsistent_data
                ) {
                    edges {
                        node {${result.join(' ')}}
                    }
                    pageInfo {
                        startCursor
                        hasPreviousPage
                    }
                }
            }
        }
    }`
    const response = await AppConfig.goshclient.net.query({
        query,
        variables: {
            address,
            msgType,
            limit,
            cursor: cursor || null,
            allow_latest_inconsistent_data,
        },
    })
    const { edges, pageInfo } = response.result.data.blockchain.account.messages

    const page = edges
        .map((edge: any) => ({ message: edge.node, decoded: null }))
        .sort((a: any, b: any) => {
            const a_lt = parseInt(a.message.created_lt, 16)
            const b_lt = parseInt(b.message.created_lt, 16)
            return b_lt - a_lt
        })
    if (abi) {
        await Promise.all(
            page.map(async (item: any) => {
                const { body, msg_type } = item.message
                item.decoded = await decodeMessageBody(
                    abiJson(JSON.stringify(abi)),
                    body,
                    msg_type,
                )
            }),
        )
    }
    messages.push(...page)

    if (!all || !pageInfo.hasPreviousPage) {
        return {
            cursor: pageInfo.startCursor,
            messages,
            hasNext: pageInfo.hasPreviousPage,
        }
    }

    await sleep(300)
    return await getMessages(
        { ...variables, cursor: pageInfo.startCursor },
        abi,
        all,
        messages,
    )
}

export const decodeMessageBody = async (
    abi: Abi,
    body: string,
    type: number,
): Promise<DecodedMessageBody | null> => {
    try {
        return await AppConfig.goshclient.abi.decode_message_body({
            abi,
            body,
            is_internal: type === 0,
            allow_partial: true,
        })
    } catch {
        return null
    }
}

export const signData = async (data: string, keys: KeyPair) => {
    return await AppConfig.goshclient.crypto.sign({
        unsigned: Buffer.from(data).toString('base64'),
        keys,
    })
}

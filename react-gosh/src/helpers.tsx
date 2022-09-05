import { abiSerialized, TonClient } from '@eversdk/core'
import cryptoJs, { SHA1, SHA256 } from 'crypto-js'
import { Buffer } from 'buffer'
import * as Diff from 'diff'
import GoshSnapshotAbi from './contracts/0.1.200/snapshot.abi.json'
import { GoshCommit, GoshSnapshot, GoshTree } from './classes'
import { IGoshRepository, TGoshCommit, TGoshTree, TGoshTreeItem } from './types'
import { sleep } from './utils'
import { AppConfig } from './appconfig'

export const ZERO_ADDR =
    '0:0000000000000000000000000000000000000000000000000000000000000000'
export const ZERO_COMMIT = '0000000000000000000000000000000000000000'
export const MAX_ONCHAIN_FILE_SIZE = 15360
export const MAX_ONCHAIN_DIFF_SIZE = 15000

export const eventTypes: { [key: number]: string } = {
    1: 'Pull request',
    2: 'Add SMV branch protection',
    3: 'Remove SMV branch protection',
}

export const getPaginatedAccounts = async (params: {
    filters?: string[]
    result?: string[]
    limit?: number
    lastId?: string
}): Promise<{ results: any[]; lastId?: string; completed: boolean }> => {
    const { filters = [], result = ['id'], limit = 10, lastId = null } = params
    const query = `query AccountsQuery( $lastId: String, $limit: Int) {
        accounts(
            filter: {
                id: { gt: $lastId },
                ${filters.join(',')}
            }
            orderBy: [{ path: "id", direction: ASC }]
            limit: $limit
        ) {
            ${result.join(' ')}
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

export const getCodeLanguageFromFilename = (monaco: any, filename: string): string => {
    let splitted = filename.split('.')
    const ext = `.${splitted.slice(-1)}`
    const found = monaco.languages
        .getLanguages()
        .find((item: any) => item.extensions && item.extensions.indexOf(ext) >= 0)
    return found?.id || 'plaintext'
}

/**
 * Convert from nanoevers to evers
 * @param value
 * @param round
 * @returns
 */
export const toEvers = (value: any, round: number = 3): number => {
    const rounder = 10 ** round
    return Math.round((value / 10 ** 9) * rounder) / rounder
}

/**
 * Convert from evers to nanoevers
 * @param value
 * @returns
 */
export const fromEvers = (value: number): number => {
    return value * 10 ** 9
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

export const sha1Tree = (items: TGoshTreeItem[], mode: 'sha1' | 'sha256') => {
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

export const sha256 = (content: string | Buffer, prefix: boolean): string => {
    const hash = SHA256(
        Buffer.isBuffer(content)
            ? cryptoJs.enc.Hex.parse(content.toString('hex'))
            : cryptoJs.enc.Utf8.parse(content),
    ).toString()

    if (prefix) return `0x${hash}`
    return hash
}

export const getTreeItemsFromPath = async (
    fullpath: string,
    hashes: { sha1: string; sha256: string },
    flags: number,
    treeItem?: TGoshTreeItem,
): Promise<TGoshTreeItem[]> => {
    const items: TGoshTreeItem[] = []

    let [path, name] = splitByPath(fullpath)
    items.push({
        flags,
        mode: treeItem?.mode || '100644',
        type: treeItem?.type || 'blob',
        sha1: hashes.sha1,
        sha256: hashes.sha256,
        path,
        name,
    })

    // Parse blob path and push subtrees to items
    while (path !== '') {
        const [dirPath, dirName] = splitByPath(path)
        if (!items.find((item) => item.path === dirPath && item.name === dirName)) {
            items.push({
                flags: 0,
                mode: '040000',
                type: 'tree',
                sha1: '',
                sha256: '',
                path: dirPath,
                name: dirName,
            })
        }
        path = dirPath
    }
    return items
}

/** Build grouped by path tree from TGoshTreeItem[] */
export const getTreeFromItems = (items: TGoshTreeItem[]): TGoshTree => {
    const isTree = (i: TGoshTreeItem) => i.type === 'tree'

    const result = items.filter(isTree).reduce(
        (acc: TGoshTree, i) => {
            const path = i.path !== '' ? `${i.path}/${i.name}` : i.name
            if (!acc.path) acc[path] = []
            return acc
        },
        { '': [] },
    )

    items.forEach((i: any) => {
        result[i.path].push(i)
    })
    return result
}

/**
 * Get repository tree for specific commit
 * @param repo
 * @param commitAddr
 * @param filterPath Load only part of tree with provided path. Full tree will be loaded if `undefined`
 * @returns
 */
export const getRepoTree = async (
    repo: IGoshRepository,
    commitAddr: string,
    filterPath?: string,
): Promise<{ tree: TGoshTree; items: TGoshTreeItem[] }> => {
    /** Recursive walker through tree blobs */
    const blobTreeWalker = async (path: string, subitems: TGoshTreeItem[]) => {
        let trees = subitems.filter((item) => item.type === 'tree')

        if (filterPath) {
            let [_path] = splitByPath(filterPath)
            const filtered: string[] = [filterPath, _path]
            while (_path !== '') {
                const [__path] = splitByPath(_path)
                filtered.push(__path)
                _path = __path
            }

            trees = trees.filter(
                (item) =>
                    filtered.indexOf(`${item.path ? `${item.path}/` : ''}${item.name}`) >=
                    0,
            )
        }

        for (let i = 0; i < trees.length; i++) {
            const tree = trees[i]
            const treeAddr = await repo.getTreeAddr(tree.sha1)
            const treeBlob = new GoshTree(AppConfig.goshclient, treeAddr)

            const treeItems = (await treeBlob.getTree()).tree
            const treePath = `${path ? `${path}/` : ''}${tree.name}`

            treeItems.forEach((item) => (item.path = treePath))
            items.push(...treeItems)
            await sleep(300)
            await blobTreeWalker(treePath, treeItems)
        }
    }

    // Get latest branch commit
    if (!commitAddr) return { tree: { '': [] }, items: [] }
    const commit = new GoshCommit(AppConfig.goshclient, commitAddr)
    const commitName = await commit.getName()

    // Get root tree items and recursively get subtrees
    let items: TGoshTreeItem[] = []
    if (commitName !== ZERO_COMMIT) {
        const rootTreeAddr = await commit.getTree()
        const rootTree = new GoshTree(AppConfig.goshclient, rootTreeAddr)
        items = (await rootTree.getTree()).tree
    }
    if (filterPath !== '') await blobTreeWalker('', items)

    // Build full tree
    const tree = getTreeFromItems(items)
    console.debug('[Helpers: getRepoTree] - Tree:', tree)
    return { tree, items }
}

/**
 * Sort the hole tree by the longest key (this key will contain blobs only),
 * calculate each subtree sha and update subtree parent item
 */
export const calculateSubtrees = (tree: TGoshTree) => {
    Object.keys(tree)
        .sort((a, b) => b.length - a.length)
        .filter((key) => key.length)
        .forEach((key) => {
            const [path, name] = splitByPath(key)
            const found = tree[path].find(
                (item) => item.path === path && item.name === name,
            )
            if (found) {
                found.sha1 = sha1Tree(tree[key], 'sha1')
                // found.sha256 = sha1Tree(tree[key], 'sha256');
                found.sha256 = `0x${sha1Tree(tree[key], 'sha256')}`
            }
        })
}

export const getBlobDiffPatch = (
    filename: string,
    modified: string,
    original: string,
) => {
    /** Git like patch representation */
    // let patch = Diff.createTwoFilesPatch(
    //     `a/${filename}`,
    //     `b/${filename}`,
    //     original,
    //     modified
    // );
    // patch = patch.split('\n').slice(1).join('\n');

    // const shaOriginal = original ? sha1(original, 'blob') : '0000000';
    // const shaModified = modified ? sha1(modified, 'blob') : '0000000';
    // patch =
    //     `index ${shaOriginal.slice(0, 7)}..${shaModified.slice(0, 7)} 100644\n` + patch;

    // if (!original) patch = patch.replace(`a/${filename}`, '/dev/null');
    // if (!modified) patch = patch.replace(`b/${filename}`, '/dev/null');

    /** Gosh snapshot recommended patch representation */
    const patch = Diff.createPatch(filename, original, modified)
    return patch.split('\n').slice(4).join('\n')
}

export const reverseBlobDiffPatch = (patch: string) => {
    const parsedDiff = Diff.parsePatch(patch)[0]

    const { oldFileName, newFileName, oldHeader, newHeader, hunks } = parsedDiff

    parsedDiff.oldFileName = newFileName
    parsedDiff.oldHeader = newHeader
    parsedDiff.newFileName = oldFileName
    parsedDiff.newHeader = oldHeader

    for (const hunk of hunks) {
        const { oldLines, oldStart, newLines, newStart, lines } = hunk
        hunk.oldLines = newLines
        hunk.oldStart = newStart
        hunk.newLines = oldLines
        hunk.newStart = oldStart

        hunk.lines = lines.map((l) => {
            if (l.startsWith('-')) return `+${l.slice(1)}`
            if (l.startsWith('+')) return `-${l.slice(1)}`
            return l
        })
    }

    return parsedDiff
}

export const getBlobAtCommit = async (
    repo: IGoshRepository,
    snapaddr: string,
    commit: string,
    treeitem: TGoshTreeItem,
) => {
    /** Get all incoming internal messages to snapshot */
    const getMessages = async (
        _addr: string,
        _commit: string,
        _retry: boolean = true,
        _reached: boolean = false,
        _approved: boolean = false,
        _cursor: string = '',
        _msgs: any[] = [],
    ): Promise<any> => {
        const queryString = `
        query{
            blockchain{
                account(
                  address:"${_addr}"
                ) {
                messages(msg_type:IntIn, last:50, before:"${_cursor}") {
                  edges{
                    node{
                      boc
                      created_lt
                    }
                    cursor
                  }
                  pageInfo{
                    hasPreviousPage
                    startCursor
                  }
                }
              }
            }
          }`
        const query = await repo.account.client.net.query({
            query: queryString,
        })
        const messages = query.result.data.blockchain.account.messages
        messages.edges.sort((a: any, b: any) => {
            const a_lt = parseInt(a.node.created_lt, 16)
            const b_lt = parseInt(b.node.created_lt, 16)
            return a_lt < b_lt ? 1 : -1
        })
        for (const item of messages.edges) {
            try {
                const decoded = await repo.account.client.abi.decode_message({
                    abi: abiSerialized(GoshSnapshotAbi),
                    message: item.node.boc,
                    allow_partial: true,
                })
                console.debug('Decoded', decoded)

                // Retry reading messages if needed message not found
                if (
                    _retry &&
                    ['constructor', 'approve', 'cancelDiff'].indexOf(decoded.name) < 0
                ) {
                    await sleep(5000)
                    return await getMessages(_addr, _commit)
                } else _retry = false

                // Process message by type
                if (decoded.name === 'constructor') {
                    _msgs.push(decoded.value)
                    return { msgs: _msgs, prevcommit: decoded.value.commit }
                } else if (decoded.name === 'approve') {
                    _approved = true
                } else if (decoded.name === 'cancelDiff') {
                    _approved = false
                } else if (decoded.name === 'destroy') {
                    return { msgs: _msgs, prevcommit: _commit }
                } else if (_approved && decoded.name === 'applyDiff') {
                    _msgs.push(decoded.value)
                    if (_reached)
                        return {
                            msgs: _msgs,
                            prevcommit: decoded.value.diff.commit,
                        }
                    if (decoded.value.diff.commit === _commit) _reached = true
                }
            } catch {}
        }

        if (messages.pageInfo.hasPreviousPage) {
            await sleep(300)
            return await getMessages(
                _addr,
                _commit,
                _retry,
                _reached,
                _approved,
                messages.pageInfo.startCursor,
                _msgs,
            )
        }
        return { msgs: _msgs, prevcommit: _commit }
    }

    /** Get snapshot content and messages and revert snapshot to commit */
    const snap = new GoshSnapshot(repo.account.client, snapaddr)
    const snapdata = await snap.getSnapshot(commit, treeitem)
    console.debug('Snap data', snapdata)
    if (Buffer.isBuffer(snapdata.content))
        return { content: snapdata.content, deployed: true }

    const { msgs, prevcommit } = await getMessages(snapaddr, commit)
    console.debug('Snap messages', msgs, prevcommit)

    let content = snapdata.content
    let deployed = false
    for (const message of msgs) {
        const msgcommit = message.diff ? message.diff.commit : message.commit
        const msgipfs = message.diff ? message.diff.ipfs : message.ipfsdata
        const msgpatch = message.diff ? message.diff.patch : null
        const msgdata = message.diff ? null : message.data

        if (msgipfs) {
            const compressed = (await loadFromIPFS(msgipfs)).toString()
            const decompressed = await zstd.decompress(
                AppConfig.goshclient,
                compressed,
                true,
            )
            content = decompressed
            // if (message.ipfsdata) deployed = true
        } else if (msgdata) {
            const compressed = Buffer.from(msgdata, 'hex').toString('base64')
            const decompressed = await zstd.decompress(
                AppConfig.goshclient,
                compressed,
                true,
            )
            content = decompressed
            // deployed = true
        } else if (msgpatch && msgcommit !== commit) {
            const patch = await zstd.decompress(
                repo.account.client,
                Buffer.from(msgpatch, 'hex').toString('base64'),
                true,
            )
            const reversedPatch = reverseBlobDiffPatch(patch)
            const reversed = Diff.applyPatch(content, reversedPatch)
            content = reversed
        }

        if (msgcommit === commit) break
        if (msgcommit && !msgipfs) {
            const msgcommitAddr = await repo.getCommitAddr(msgcommit)
            const msgcommitObj = new GoshCommit(AppConfig.goshclient, msgcommitAddr)
            const msgcommitParents = await msgcommitObj.getParents()
            const parent = new GoshCommit(AppConfig.goshclient, msgcommitParents[0])
            const parentName = await parent.getName()
            if (parentName === commit) break
        }
    }
    console.debug('Result content', content)
    return { content, deployed, prevcommit }
}

export const getCommit = async (
    repo: IGoshRepository,
    commitAddr: string,
): Promise<TGoshCommit> => {
    const commit = new GoshCommit(repo.account.client, commitAddr)
    const meta = await commit.getCommit()
    const commitData = {
        addr: commitAddr,
        addrRepo: meta.repo,
        branch: meta.branch,
        name: meta.sha,
        content: meta.content,
        parents: meta.parents,
    }

    return {
        ...commitData,
        content: GoshCommit.parseContent(commitData.content),
    }
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
    client: TonClient,
    length: number,
    hex: boolean = false,
): Promise<string> => {
    const result = await client.crypto.generate_random_bytes({ length })
    if (hex) return Buffer.from(result.bytes, 'base64').toString('hex')
    return result.bytes
}

export const chacha20 = {
    async encrypt(
        client: TonClient,
        data: string,
        key: string,
        nonce: string,
    ): Promise<string> {
        const result = await client.crypto.chacha20({
            data,
            key: key.padStart(64, '0'),
            nonce,
        })
        return result.data
    },
    async decrypt(
        client: TonClient,
        data: string,
        key: string,
        nonce: string,
    ): Promise<string> {
        const result = await client.crypto.chacha20({
            data,
            key: key.padStart(64, '0'),
            nonce,
        })
        return result.data
    },
}

export const zstd = {
    async compress(client: TonClient, data: string | Buffer): Promise<string> {
        const uncompressed = Buffer.isBuffer(data)
            ? data.toString('base64')
            : Buffer.from(data).toString('base64')
        const result = await client.utils.compress_zstd({
            uncompressed,
        })
        return result.compressed
    },
    async decompress(
        client: TonClient,
        data: string,
        uft8: boolean = true,
    ): Promise<string> {
        const result = await client.utils.decompress_zstd({ compressed: data })
        if (uft8) return Buffer.from(result.decompressed, 'base64').toString()
        return result.decompressed
    },
}

/**
 * @link https://docs.ipfs.io/reference/http/api/#api-v0-add
 * @param content
 * @param filename
 * @returns
 */
export const saveToIPFS = async (content: string, filename?: string): Promise<string> => {
    if (!process.env.REACT_APP_IPFS) throw new Error('IPFS url undefined')

    const form = new FormData()
    const blob = new Blob([content])
    form.append('file', blob, filename)

    const response = await fetch(
        `${process.env.REACT_APP_IPFS}/api/v0/add?pin=true&quiet=true`,
        { method: 'POST', body: form },
    )

    if (!response.ok)
        throw new Error(`Error while uploading (${JSON.stringify(response)})`)
    const responseBody = await response.json()
    const { Hash: cid } = responseBody
    return cid
}

/**
 * @param cid
 * @returns
 */
export const loadFromIPFS = async (cid: string): Promise<Buffer> => {
    if (!process.env.REACT_APP_IPFS) throw new Error('IPFS url undefined')

    const response = await fetch(`${process.env.REACT_APP_IPFS}/ipfs/${cid.toString()}`, {
        method: 'GET',
    })

    if (!response.ok)
        throw new Error(`Error while uploading (${JSON.stringify(response)})`)
    return Buffer.from(await response.arrayBuffer())
}

export const splitByChunk = (array: any[], chunkSize: number = 10): any[][] => {
    const chunks = []
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
}

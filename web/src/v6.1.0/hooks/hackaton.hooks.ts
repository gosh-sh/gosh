import _ from 'lodash'
import { useCallback, useEffect, useState } from 'react'
import { GoshAdapterFactory, sha1, unixtimeWithTz, usePush } from 'react-gosh'
import { useParams } from 'react-router-dom'
import { useRecoilState, useRecoilValue } from 'recoil'
import { getAllAccounts, getPaginatedAccounts } from '../../blockchain/utils'
import { HACKATON_TAG, MAX_PARALLEL_READ, ZERO_COMMIT } from '../../constants'
import { GoshError } from '../../errors'
import { appToastStatusSelector } from '../../store/app.state'
import { EDaoEventType } from '../../types/common.types'
import { executeByChunk } from '../../utils'
import { getSystemContract } from '../blockchain/helpers'
import { GoshRepository } from '../blockchain/repository'
import { daoHackatonListSelector, daoHackatonSelector } from '../store/hackaton.state'
import {
    EHackatonType,
    THackatonDetails,
    THackatonParticipant,
} from '../types/hackaton.types'
import { useDao, useDaoHelpers, useDaoMember } from './dao.hooks'
import { useUser } from './user.hooks'

export function useCreateHackaton() {
    const { user } = useUser()
    const dao = useDao()
    const member = useDaoMember()
    const { beforeCreateEvent } = useDaoHelpers()
    const [status, setStatus] = useRecoilState(appToastStatusSelector('__createhackaton'))

    const create = async (params: {
        title: string
        type: EHackatonType
        description: {
            short: string
            readme: string
            rules: string
            prize: string
        }
        prize: {
            total: string
            places: string[]
        }
        dates: {
            start: number
            voting: number
            finish: number
        }
        comment?: string
    }) => {
        const { title, type, description, prize, dates, comment } = params

        try {
            if (Object.values(EHackatonType).indexOf(type) < 0) {
                throw new GoshError('Value error', { message: 'Incorrect type', type })
            }

            // Prepare balance for create event (member wallet is checked here)
            await beforeCreateEvent(20, { onPendingCallback: setStatus })

            // Prepare repository
            setStatus((state) => ({
                ...state,
                type: 'pending',
                data: `Prepare ${type} repository`,
            }))
            const reponame = `_${type}_${Date.now()}`
            const branch = 'main'
            // TODO: Get repository adapter (rewrite this part after refactor)
            const gosh = GoshAdapterFactory.create(dao.details.version!)
            const _repository = await gosh.getRepository({
                path: `${dao.details.name}/${reponame}`,
            })
            _repository.auth = { username: user.username, wallet0: member.wallet }
            _repository.name = reponame
            // /Get repository adapter (rewrite this part after refactor)

            // Generate and push commit without setCommit
            // Create blobs data
            const blobs = [
                {
                    treepath: ['', 'README.md'],
                    original: '',
                    modified: description.readme,
                },
                {
                    treepath: ['', 'RULES.md'],
                    original: '',
                    modified: description.rules,
                },
                {
                    treepath: ['', 'PRIZE.md'],
                    original: '',
                    modified: description.prize,
                },
                {
                    treepath: ['', 'metadata.json'],
                    original: '',
                    modified: JSON.stringify({ title, prize, dates }, undefined, 2),
                },
            ]
            const branch_tree = { tree: '', items: [] }
            const blobs_data = await Promise.all(
                blobs.map(async (blob) => {
                    return await _repository.getBlobPushDataOut(branch_tree.items, blob)
                }),
            )
            console.debug('blobs_data', blobs_data)

            // Create future tree
            const future_tree = await _repository.getTreePushDataOut(
                branch_tree.items,
                blobs_data.flat(),
            )

            // Create future commit
            const commit_email = `${user.username!.replace('@', '')}@gosh.sh`
            const commit_string = [
                `tree ${future_tree.sha1}`,
                `author ${user.username} <${commit_email}> ${unixtimeWithTz()}`,
                `committer ${user.username} <${commit_email}> ${unixtimeWithTz()}`,
                '',
                `Initialize ${type} repository`,
            ]
                .filter((item) => item !== null)
                .join('\n')
            const commit_hash = sha1(commit_string, 'commit', 'sha1')
            const commit_parent = {
                address: await gosh.getCommitAddress({
                    repo_addr: _repository.getAddress(),
                    commit_name: ZERO_COMMIT,
                }),
                version: _repository.getVersion(),
            }

            // Update future tree
            future_tree.sha256 = await _repository.getTreeSha256Out({
                items: future_tree.tree[''].map((item) => ({
                    ...item,
                    commit: commit_hash,
                })),
            })
            console.debug('future_tree', future_tree)

            // Deploy future commit and etc.
            await _repository.deployCommitOut(
                branch,
                commit_hash,
                commit_string,
                [commit_parent],
                future_tree.sha256,
                false,
            )
            await Promise.all(
                future_tree.updated.map(async (path) => {
                    const with_commit = future_tree.tree[path].map((item) => {
                        return { ...item, commit: commit_hash }
                    })
                    await _repository.deployTreeOut(with_commit)
                }),
            )
            await Promise.all(
                blobs_data.flat().map(async ({ data }) => {
                    const { treepath, content } = data
                    await _repository.deploySnapshotOut(commit_hash, treepath, content)
                }),
            )

            // Create cells for DAO multi event
            setStatus((state) => ({
                ...state,
                type: 'pending',
                data: 'Create event',
            }))
            const cells = [
                {
                    type: EDaoEventType.REPO_CREATE,
                    params: {
                        name: reponame,
                        description: description.short,
                        comment: `Create ${type} repository`,
                    },
                },
                {
                    type: EDaoEventType.REPO_TAG_ADD,
                    params: {
                        reponame,
                        tags: [HACKATON_TAG[type]],
                        comment: `Add system tag to ${type} repository`,
                    },
                },
                { type: EDaoEventType.DELAY, params: {} },
                { type: EDaoEventType.DELAY, params: {} },
                {
                    type: EDaoEventType.PULL_REQUEST,
                    params: {
                        repo_name: reponame,
                        branch_name: branch,
                        commit_name: commit_hash,
                        num_files: 0,
                        num_commits: 1,
                        comment: 'Initialize repository',
                    },
                },
                {
                    type: EDaoEventType.BRANCH_LOCK,
                    params: {
                        repo_name: reponame,
                        branch_name: branch,
                        comment: `Protect branch ${branch}`,
                    },
                },
            ]

            const eventaddr = await member.wallet!.createMultiEvent({
                proposals: cells,
                comment: comment || `Create ${type}`,
            })
            setStatus((state) => ({
                ...state,
                type: 'success',
                data: {
                    title: 'Create event',
                    content: `Create ${type} event created`,
                },
            }))

            return { eventaddr }
        } catch (e: any) {
            setStatus((state) => ({ ...state, type: 'error', data: e }))
            throw e
        }
    }

    return { create, status }
}

export function useDaoHackatonList(
    params: { count?: number; initialize?: boolean } = {},
) {
    const { count = 10, initialize } = params
    const { details: dao } = useDao()
    const [data, setData] = useRecoilState(daoHackatonListSelector(dao.name))

    const getBlockchainItems = async (params: {
        dao_address: string
        limit: number
        cursor?: string
    }) => {
        const { dao_address, limit, cursor } = params
        const sc = getSystemContract()
        const code_hash = [
            await sc.getDaoRepositoryTagCodeHash(dao_address, HACKATON_TAG.hackaton),
            await sc.getDaoRepositoryTagCodeHash(dao_address, HACKATON_TAG.grant),
        ]
        const { results, lastId, completed } = await getPaginatedAccounts({
            filters: [`code_hash: {in: ${JSON.stringify(code_hash)}}`],
            limit,
            lastId: cursor,
        })

        const items = await executeByChunk<{ id: string }, THackatonDetails>(
            results,
            MAX_PARALLEL_READ,
            async ({ id }) => {
                const tag_account = await sc.getGoshTag({ address: id })
                const { repo_address } = await tag_account.getDetails()
                const repo_account = await sc.getRepository({ address: repo_address })
                const repo_details = await repo_account.getDetails()

                let type = EHackatonType.HACKATON
                if (repo_details.tags.indexOf(HACKATON_TAG.grant) >= 0) {
                    type = EHackatonType.GRANT
                }

                return {
                    account: repo_account,
                    address: repo_account.address,
                    name: repo_details.name,
                    type,
                    description: repo_details.description,
                    tags_raw: repo_details.tags,
                    participants: [],
                    metadata: {},
                }
            },
        )
        return { items, cursor: lastId, has_next: !completed }
    }

    const getHackatonList = useCallback(async () => {
        try {
            if (!dao.address) {
                return
            }

            setData((state) => ({ ...state, is_fetching: true }))
            const blockchain = await getBlockchainItems({
                dao_address: dao.address!,
                limit: count,
            })
            setData((state) => {
                const different = _.differenceWith(
                    blockchain.items,
                    state.items,
                    (a, b) => a.address === b.address,
                )
                const intersect = _.intersectionWith(
                    blockchain.items,
                    state.items,
                    (a, b) => a.address === b.address,
                )
                return {
                    ...state,
                    items: [...different, ...state.items].map((item) => {
                        const found = intersect.find((_item) => {
                            return _item.address === item.address
                        })
                        return found ? { ...item, ...found } : item
                    }),
                    cursor: blockchain.cursor,
                    has_next: blockchain.has_next,
                }
            })
        } catch (e) {
            setData((state) => ({ ...state, error: e }))
        } finally {
            setData((state) => ({ ...state, is_fetching: false }))
        }
    }, [dao.address, count])

    const getNext = useCallback(async () => {
        try {
            setData((state) => ({ ...state, is_fetching: true }))
            const blockchain = await getBlockchainItems({
                dao_address: dao.address!,
                limit: count,
                cursor: data.cursor,
            })
            setData((state) => {
                const different = _.differenceWith(
                    blockchain.items,
                    state.items,
                    (a, b) => a.address === b.address,
                )
                return {
                    ...state,
                    items: [...state.items, ...different],
                    cursor: blockchain.cursor,
                    has_next: blockchain.has_next,
                }
            })
        } catch (e: any) {
            throw e
        } finally {
            setData((state) => ({ ...state, is_fetching: false }))
        }
    }, [dao.address, data.cursor])

    useEffect(() => {
        if (initialize) {
            getHackatonList()
        }
    }, [initialize, getHackatonList])

    return {
        ...data,
        getNext,
        is_empty: !data.is_fetching && !data.items.length,
    }
}

export function useHackaton(
    options: { initialize?: boolean; subscribe?: boolean; repo_name?: string } = {},
) {
    const { initialize, subscribe } = options
    const url_params = useParams()
    const { user } = useUser()
    const member = useDaoMember()
    const repo_name = options.repo_name || url_params.reponame || ''
    const { details: dao } = useDao()
    const [hackatons, setHakatons] = useRecoilState(daoHackatonListSelector(dao.name))
    const hackaton = useRecoilValue(daoHackatonSelector(repo_name))
    const [error, setError] = useState<any>()

    const getHackaton = useCallback(async () => {
        if (!dao.name) {
            return
        }

        const sc = getSystemContract()

        try {
            // Search for hackaton in hackaton list state atom
            let found = hackatons.items.find((item) => item.name === repo_name)

            // Fetch hackaton's metadata from blockchain
            if (!found) {
                const repo_path = `${dao.name}/${repo_name}`
                const repo_account = await sc.getRepository({ path: repo_path })
                const repo_details = await repo_account.getDetails()

                let type = EHackatonType.HACKATON
                if (repo_details.tags.indexOf(HACKATON_TAG.grant) >= 0) {
                    type = EHackatonType.GRANT
                }

                found = {
                    account: repo_account,
                    address: repo_account.address,
                    name: repo_details.name,
                    type,
                    description: repo_details.description,
                    tags_raw: repo_details.tags,
                    participants: [],
                    metadata: {},
                }

                setHakatons((state) => {
                    const exists = state.items.find((v) => v.address === found?.address)
                    return {
                        ...state,
                        items: !exists ? [...state.items, found!] : state.items,
                    }
                })
            }

            ////
            // TODO: Remove after git refactor
            const _gosh = GoshAdapterFactory.create(dao.version!)
            const _dao_adapter = await _gosh.getDao({ address: dao.address! })
            const _dao_details = await _dao_adapter.getDetails()
            const _repo_adapter = await _dao_adapter.getRepository({
                name: repo_name,
            })
            _repo_adapter.auth = { username: user.username, wallet0: member.wallet }
            found._rg_dao_details = { ..._dao_details, isAuthMember: member.isMember }
            found._rg_repo_adapter = _repo_adapter
            setHakatons((state) => ({
                ...state,
                items: state.items.map((item) => {
                    if (item.address === found?.address) {
                        return { ...item, ...found }
                    }
                    return item
                }),
            }))
            ////

            // Fetch hackaton metadata if not fetching
            if (!found.metadata.is_fetching) {
                getHackatonData(found.account!)
                getHackatonParticipants(found.account!)
            }
        } catch (e: any) {
            setError(e)
        }
    }, [dao.name, repo_name, member.isMember, member.wallet?.address])

    const getHackatonData = async (repo_account: GoshRepository) => {
        try {
            setHakatons((state) => ({
                ...state,
                items: state.items.map((item) => {
                    if (item.address === repo_account.address) {
                        return {
                            ...item,
                            metadata: { ...item.metadata, is_fetching: true },
                        }
                    }
                    return item
                }),
            }))

            // Read metadata
            const branch = await repo_account.getBranch('main')
            const commit_account = await repo_account.getCommit({
                address: branch.commit.address,
            })
            const commit_data = await commit_account.getDetails()
            const tree_account = await repo_account.getTree({
                address: commit_data.treeaddr,
            })
            const tree_items = await tree_account.getDetails()
            const snap_data = await Promise.all(
                tree_items.map(async (item) => {
                    const snap_account = await repo_account.getSnapshot({
                        data: { commitname: item.commit_name, filename: item.name },
                    })
                    const content = await snap_account.getContent()
                    return { ...item, content }
                }),
            )

            // Create updated metadata
            const metadata: THackatonDetails['metadata'] = {
                is_fetching: false,
                title: '',
                description: { readme: '', rules: '', prize: '' },
                prize: { total: 0, places: [] },
                dates: { start: 0, voting: 0, finish: 0 },
            }
            for (const file of ['readme.md', 'rules.md', 'prize.md', 'metadata.json']) {
                const item = snap_data.find((v) => v.name.toLowerCase() === file)
                if (!item) {
                    continue
                }

                const { is_binary, content } = item.content.approved
                if (is_binary || !content) {
                    continue
                }

                if (file === 'metadata.json') {
                    metadata.raw = content as string

                    const parsed = JSON.parse(metadata.raw)
                    metadata.title = parsed.title
                    metadata.prize = parsed.prize
                    metadata.dates = parsed.dates
                } else {
                    const key = file.split('.')[0]
                    const description = {
                        ...metadata.description,
                        [key]: content as string,
                    }
                    metadata.description = description as typeof metadata['description']
                }
            }

            // Update state
            setHakatons((state) => ({
                ...state,
                items: state.items.map((item) => {
                    if (item.address === repo_account.address) {
                        return { ...item, metadata }
                    }
                    return item
                }),
            }))
        } catch (e: any) {
            setError(e)
        }
    }

    const getHackatonParticipants = async (repo_account: GoshRepository) => {
        try {
            const sc = getSystemContract()
            const code_hash = await repo_account.getCommitTagCodeHash()
            const accounts = await getAllAccounts({
                filters: [`code_hash: {eq:"${code_hash}"}`],
            })
            const participants = await executeByChunk<
                { id: string },
                THackatonParticipant
            >(accounts, MAX_PARALLEL_READ, async ({ id }) => {
                const tag = await repo_account.getCommitTag({ address: id })
                const details = await tag.getDetails()
                const parsed = JSON.parse(details.content)

                const pdao_account = await sc.getDao({ name: parsed.dao_name })
                const is_member = user.profile
                    ? await pdao_account.isMember(user.profile)
                    : false

                const prepo_account = await sc.getRepository({
                    path: `${parsed.dao_name}/${parsed.repo_name}`,
                })
                const repo_details = await prepo_account.getDetails()

                return { ...parsed, is_member, description: repo_details.description }
            })
            console.debug('P', participants)

            // Update state
            setHakatons((state) => ({
                ...state,
                items: state.items.map((item) => {
                    if (item.address === repo_account.address) {
                        return { ...item, participants }
                    }
                    return item
                }),
            }))
        } catch (e: any) {
            setError(e)
        }
    }

    useEffect(() => {
        if (initialize) {
            getHackaton()
        }
    }, [initialize, getHackaton])

    return { data: hackaton, error, getHackatonParticipants }
}

export function useUpdateHackatonDetails() {
    const hackaton = useHackaton()
    const { push } = usePush(
        hackaton.data?._rg_dao_details!,
        hackaton.data?._rg_repo_adapter!,
        'main',
    )
    const { beforeCreateEvent } = useDaoHelpers()
    const [status, setStatus] = useRecoilState(
        appToastStatusSelector('__updatehackatondetails'),
    )

    const update = async (params: {
        repo_name: string
        filename: string
        content: { original: string; modified: string }
    }) => {
        // TODO: repo_name should be used after git part refactor
        const { repo_name, filename, content } = params

        try {
            await beforeCreateEvent(20, { onPendingCallback: setStatus })

            setStatus((state) => ({
                ...state,
                type: 'pending',
                data: `Updating ${filename}`,
            }))

            // TODO: Remove after git refactor
            const _tbranch = await hackaton.data?._rg_repo_adapter?.getBranch('main')
            const event_address = await push(
                `Update ${filename}`,
                [
                    {
                        treepath: [filename, filename],
                        original: content.original,
                        modified: content.modified,
                    },
                ],
                { isPullRequest: true, tbranch: _tbranch },
            )

            setStatus((state) => ({
                ...state,
                type: 'success',
                data: {
                    title: 'Create event',
                    content: `Update ${filename} event created`,
                },
            }))

            return { event_address }
        } catch (e) {
            setStatus((state) => ({ ...state, type: 'error', data: e }))
            throw e
        }
    }

    return { update, status }
}

export function useAddHackatonParticipants() {
    const member = useDaoMember()
    const hackaton = useHackaton()
    const [status, setStatus] = useRecoilState(
        appToastStatusSelector('__addhackatonparticipants'),
    )

    const addParticipants = async (params: {
        items: { dao_name: string; repo_name: string }[]
    }) => {
        const { items } = params

        try {
            if (!member.wallet) {
                throw new GoshError('Value error', 'User wallet undefined')
            }
            if (!hackaton.data?.name || !hackaton.data.account) {
                throw new GoshError('Value error', 'Hackaton repository undefined')
            }

            setStatus((state) => ({
                ...state,
                type: 'pending',
                data: 'Adding participants indexes',
            }))

            await Promise.all(
                items.map(async (item) => {
                    const repo_path = `${item.dao_name}/${item.repo_name}`
                    const tag_name = `${HACKATON_TAG.participant}:${repo_path}`
                    await member.wallet!.createCommitTag({
                        reponame: hackaton.data!.name,
                        name: tag_name,
                        content: JSON.stringify(item),
                        commit: {
                            address: `0:${new Array(64).fill(0).join('')}`,
                            name: ZERO_COMMIT,
                        },
                    })
                }),
            )
            await hackaton.getHackatonParticipants(hackaton.data.account)

            setStatus((state) => ({
                ...state,
                type: 'success',
                data: 'Participants succesfully added',
            }))
        } catch (e) {
            setStatus((state) => ({ ...state, type: 'error', data: e }))
            throw e
        }
    }

    return { addParticipants, status }
}

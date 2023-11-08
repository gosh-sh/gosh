import _ from 'lodash'
import moment from 'moment'
import { useCallback, useEffect, useState } from 'react'
import { GoshAdapterFactory, sha1, unixtimeWithTz, usePush } from 'react-gosh'
import { useParams } from 'react-router-dom'
import { useRecoilState, useRecoilValue } from 'recoil'
import { getAllAccounts, getPaginatedAccounts } from '../../blockchain/utils'
import { HACKATHON_TAG, MAX_PARALLEL_READ, ZERO_COMMIT } from '../../constants'
import { GoshError } from '../../errors'
import { appToastStatusSelector } from '../../store/app.state'
import { EDaoEventType } from '../../types/common.types'
import { executeByChunk, setLockableInterval } from '../../utils'
import { getSystemContract } from '../blockchain/helpers'
import { GoshRepository } from '../blockchain/repository'
import {
    daoHackathonListSelector,
    daoHackathonSelector,
    metadata_empty,
    participants_empty,
} from '../store/hackathon.state'
import {
    EHackathonType,
    THackathonDetails,
    THackathonParticipant,
} from '../types/hackathon.types'
import { useDao, useDaoHelpers, useDaoMember } from './dao.hooks'
import { useUser } from './user.hooks'

export function useCreateHackathon() {
    const { user } = useUser()
    const dao = useDao()
    const member = useDaoMember()
    const { beforeCreateEvent } = useDaoHelpers()
    const [status, setStatus] = useRecoilState(
        appToastStatusSelector('__createhackathon'),
    )

    const create = async (params: {
        title: string
        type: EHackathonType
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
            if (Object.values(EHackathonType).indexOf(type) < 0) {
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
                        tags: [HACKATHON_TAG[type]],
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

export function useDaoHackathonList(
    params: { count?: number; initialize?: boolean } = {},
) {
    const { count = 10, initialize } = params
    const { details: dao } = useDao()
    const [data, setData] = useRecoilState(daoHackathonListSelector(dao.name))

    const getBlockchainItems = async (params: {
        dao_address: string
        limit: number
        cursor?: string
    }) => {
        const { dao_address, limit, cursor } = params
        const sc = getSystemContract()
        const code_hash = [
            await sc.getDaoRepositoryTagCodeHash(dao_address, HACKATHON_TAG.hackathon),
            await sc.getDaoRepositoryTagCodeHash(dao_address, HACKATHON_TAG.grant),
        ]
        const { results, lastId, completed } = await getPaginatedAccounts({
            filters: [`code_hash: {in: ${JSON.stringify(code_hash)}}`],
            limit,
            lastId: cursor,
        })

        const items = await executeByChunk<{ id: string }, THackathonDetails>(
            results,
            MAX_PARALLEL_READ,
            async ({ id }) => {
                const tag_account = await sc.getGoshTag({ address: id })
                const { repo_address } = await tag_account.getDetails()
                const repo_account = await sc.getRepository({ address: repo_address })
                const repo_details = await repo_account.getDetails()

                let type = EHackathonType.HACKATHON
                if (repo_details.tags.indexOf(HACKATHON_TAG.grant) >= 0) {
                    type = EHackathonType.GRANT
                }

                return {
                    account: repo_account,
                    address: repo_account.address,
                    name: repo_details.name,
                    type,
                    description: repo_details.description,
                    tags_raw: repo_details.tags,
                    metadata: metadata_empty,
                    participants: participants_empty,
                }
            },
        )
        return { items, cursor: lastId, has_next: !completed }
    }

    const getHackathonList = useCallback(async () => {
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
                        return found
                            ? {
                                  ...item,
                                  ...found,
                                  metadata: item.metadata,
                                  participants: item.participants,
                              }
                            : item
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
            getHackathonList()
        }
    }, [initialize, getHackathonList])

    return {
        ...data,
        getNext,
        is_empty: !data.is_fetching && !data.items.length,
    }
}

export function useHackathon(
    options: { initialize?: boolean; subscribe?: boolean; repo_name?: string } = {},
) {
    const { initialize, subscribe } = options
    const url_params = useParams()
    const { user } = useUser()
    const member = useDaoMember()
    const repo_name = options.repo_name || url_params.reponame || ''
    const { details: dao } = useDao()
    const [hackathons, setHakathons] = useRecoilState(daoHackathonListSelector(dao.name))
    const hackathon = useRecoilValue(daoHackathonSelector(repo_name))
    const [error, setError] = useState<any>()

    const getHackathon = useCallback(async () => {
        if (!dao.name) {
            return
        }

        const sc = getSystemContract()

        try {
            // Search for hackathon in hackathon list state atom
            let found = hackathons.items.find((item) => item.name === repo_name)

            // Fetch hackathon's metadata from blockchain
            if (!found) {
                const repo_path = `${dao.name}/${repo_name}`
                const repo_account = await sc.getRepository({ path: repo_path })
                const repo_details = await repo_account.getDetails()

                let type = EHackathonType.HACKATHON
                if (repo_details.tags.indexOf(HACKATHON_TAG.grant) >= 0) {
                    type = EHackathonType.GRANT
                }

                found = {
                    account: repo_account,
                    address: repo_account.address,
                    name: repo_details.name,
                    type,
                    description: repo_details.description,
                    tags_raw: repo_details.tags,
                    metadata: metadata_empty,
                    participants: participants_empty,
                }

                setHakathons((state) => {
                    const exists = state.items.find((v) => v.address === found?.address)
                    return {
                        ...state,
                        items: !exists ? [...state.items, found!] : state.items,
                    }
                })
                console.debug('Found', found)
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
            found._rg_fetched = true
            setHakathons((state) => ({
                ...state,
                items: state.items.map((item) => {
                    if (item.address === found?.address) {
                        return { ...item, ...found }
                    }
                    return item
                }),
            }))
            ////

            // Fetch hackathon metadata if not fetching
            if (!found.metadata.is_fetching) {
                console.debug('getHackathonData')
                getHackathonData(found.account)
                getHackathonParticipants(found.account)
            }
        } catch (e: any) {
            setError(e)
        }
    }, [dao.name, repo_name, member.isMember, member.wallet?.address])

    const getHackathonData = async (repo_account: GoshRepository) => {
        try {
            setHakathons((state) => ({
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
            const metadata = { ...metadata_empty, is_fetched: true, is_fetching: false }
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
            setHakathons((state) => ({
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

    const getHackathonParticipants = async (repo_account: GoshRepository) => {
        try {
            setHakathons((state) => ({
                ...state,
                items: state.items.map((item) => {
                    if (item.address === repo_account.address) {
                        return {
                            ...item,
                            participants: { ...item.participants, is_fetching: true },
                        }
                    }
                    return item
                }),
            }))

            const sc = getSystemContract()
            const code_hash = await repo_account.getCommitTagCodeHash()
            const accounts = await getAllAccounts({
                filters: [`code_hash: {eq:"${code_hash}"}`],
            })
            const participants = await executeByChunk<
                { id: string },
                THackathonParticipant
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

            // Update state
            setHakathons((state) => ({
                ...state,
                items: state.items.map((item) => {
                    if (item.address === repo_account.address) {
                        return {
                            ...item,
                            participants: { items: participants, is_fetching: false },
                        }
                    }
                    return item
                }),
            }))
        } catch (e: any) {
            setError(e)
        }
    }

    const updateFlags = useCallback(() => {
        console.debug('updateFlags')
        const now = moment().unix()
        const start = hackathon?.metadata.dates.start || now + 1
        const voting = hackathon?.metadata.dates.voting || now + 1
        const finish = hackathon?.metadata.dates.finish || now + 1

        setHakathons((state) => ({
            ...state,
            items: state.items.map((item) => {
                if (item.address === hackathon?.address) {
                    return {
                        ...item,
                        participate_enabled: now >= start && now < voting,
                        update_enabled: now < finish,
                    }
                }
                return item
            }),
        }))
    }, [hackathon?.metadata.dates])

    useEffect(() => {
        if (initialize) {
            getHackathon()
        }
    }, [initialize, getHackathon])

    useEffect(() => {
        let interval: NodeJS.Timeout

        if (subscribe) {
            updateFlags()
            interval = setInterval(updateFlags, 5000)
        }

        return () => {
            clearInterval(interval)
        }
    }, [subscribe, updateFlags])

    useEffect(() => {
        let interval: NodeJS.Timeout

        if (subscribe && hackathon?.account) {
            interval = setLockableInterval(async () => {
                console.debug('Update hackathon details')
                await getHackathonData(hackathon.account)
                await getHackathonParticipants(hackathon.account)
            }, 60000)
        }

        return () => {
            clearInterval(interval)
        }
    }, [subscribe, hackathon?.address])

    return { hackathon, error, getHackathonParticipants }
}

export function useUpdateHackathonDetails() {
    const { hackathon } = useHackathon()
    const { push } = usePush(
        hackathon?._rg_dao_details!,
        hackathon?._rg_repo_adapter!,
        'main',
    )
    const { beforeCreateEvent } = useDaoHelpers()
    const [status, setStatus] = useRecoilState(
        appToastStatusSelector('__updatehackathondetails'),
    )

    const update = async (params: {
        repo_name: string
        filename: string
        content: { original: string; modified: string }
    }) => {
        // TODO: repo_name should be used after git part refactor
        const { repo_name, filename, content } = params
        const now = moment().unix()
        const finish = hackathon?.metadata.dates.finish || now + 1

        try {
            if (now >= finish) {
                throw new GoshError('Value error', 'Update details time expired')
            }

            await beforeCreateEvent(20, { onPendingCallback: setStatus })

            setStatus((state) => ({
                ...state,
                type: 'pending',
                data: `Updating ${filename}`,
            }))

            // TODO: Remove after git refactor
            const _tbranch = await hackathon?._rg_repo_adapter?.getBranch('main')
            const event_address = await push(
                `Update details for ${hackathon?.metadata.title} ${hackathon?.type}`,
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

export function useAddHackathonParticipants() {
    const member = useDaoMember()
    const { hackathon, getHackathonParticipants } = useHackathon()
    const [status, setStatus] = useRecoilState(
        appToastStatusSelector('__addhackathonparticipants'),
    )

    const addParticipants = async (params: {
        items: { dao_name: string; repo_name: string }[]
    }) => {
        const { items } = params
        const now = moment().unix()

        try {
            if (!member.wallet) {
                throw new GoshError('Value error', 'User wallet undefined')
            }
            if (!hackathon?.name || !hackathon.account) {
                throw new GoshError('Value error', 'Hackathon repository undefined')
            }
            if (now >= hackathon.metadata.dates.voting) {
                throw new GoshError('Value error', 'Add applications time expired')
            }

            setStatus((state) => ({
                ...state,
                type: 'pending',
                data: 'Adding participants indexes',
            }))

            await Promise.all(
                items.map(async (item) => {
                    const repo_path = `${item.dao_name}/${item.repo_name}`
                    const tag_name = `${HACKATHON_TAG.participant}:${repo_path}`
                    await member.wallet!.createCommitTag({
                        reponame: hackathon!.name,
                        name: tag_name,
                        content: JSON.stringify(item),
                        commit: {
                            address: `0:${new Array(64).fill(0).join('')}`,
                            name: ZERO_COMMIT,
                        },
                    })
                }),
            )
            await getHackathonParticipants(hackathon.account)

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

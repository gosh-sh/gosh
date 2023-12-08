import { Buffer } from 'buffer'
import _ from 'lodash'
import moment from 'moment'
import { useCallback, useEffect, useState } from 'react'
import { GoshAdapterFactory, sha1, unixtimeWithTz, usePush } from 'react-gosh'
import { IGoshRepositoryAdapter } from 'react-gosh/dist/gosh/interfaces'
import { useParams } from 'react-router-dom'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { AppConfig } from '../../appconfig'
import { getAllAccounts, getPaginatedAccounts } from '../../blockchain/utils'
import { HACKATHON_TAG, MAX_PARALLEL_READ, ZERO_COMMIT } from '../../constants'
import { GoshError } from '../../errors'
import { appToastStatusSelector } from '../../store/app.state'
import { EDaoEventType } from '../../types/common.types'
import { executeByChunk, setLockableInterval } from '../../utils'
import { Dao } from '../blockchain/dao'
import { Hackathon } from '../blockchain/hackathon'
import { getSystemContract } from '../blockchain/helpers'
import { GoshRepository } from '../blockchain/repository'
import {
    apps_submitted_empty,
    daoHackathonListSelector,
    daoHackathonSelector,
    storagedata_empty,
} from '../store/hackathon.state'
import {
    EHackathonType,
    THackathonApplication,
    THackathonDetails,
    THackathonParticipant,
} from '../types/hackathon.types'
import { useDao, useDaoHelpers, useDaoMember } from './dao.hooks'
import { useUser } from './user.hooks'

export function useCreateHackathon() {
    const { user } = useUser()
    const { details: dao } = useDao()
    const member = useDaoMember()
    const { beforeCreateEvent } = useDaoHelpers()
    const [status, setStatus] = useRecoilState(
        appToastStatusSelector('__createhackathon'),
    )

    const create = useCallback(
        async (params: {
            name: string
            type: EHackathonType
            description: {
                brief: string
                readme: string
                rules: string
                prizes: string
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
            expert_tags: string[]
            comment?: string
        }) => {
            const { name, type, description, prize, dates, expert_tags, comment } = params

            try {
                if (Object.values(EHackathonType).indexOf(type) < 0) {
                    throw new GoshError('Value error', {
                        message: 'Incorrect type',
                        type,
                    })
                }
                if (!dao.account) {
                    throw new GoshError('Value error', 'DAO account undefined')
                }

                const event_cells = []
                const hackathon_name = name.trim()
                const branch_name = _.kebabCase(new Date().toISOString())

                // Prepare balance for create event (member wallet is checked here)
                await beforeCreateEvent(20, { onPendingCallback: setStatus })

                // Prepare repository
                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: `Preparing ${type} repository`,
                }))

                const _gosh = GoshAdapterFactory.create(dao.version!)
                const _repo = await _gosh.getRepository({
                    path: `${dao.name}/_hackathons`,
                })
                _repo.auth = { username: user.username, wallet0: member.wallet }
                _repo.name = '_hackathons'

                if (!(await _repo.isDeployed())) {
                    event_cells.push(
                        {
                            type: EDaoEventType.REPO_CREATE,
                            params: {
                                name: _repo.name,
                                description: 'Hackathons container repository',
                                comment: `Create hackathons repository`,
                            },
                        },
                        { type: EDaoEventType.DELAY, params: {} },
                    )
                }

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
                        treepath: ['', 'PRIZES.md'],
                        original: '',
                        modified: description.prizes,
                    },
                    {
                        treepath: ['', 'metadata.json'],
                        original: '',
                        modified: JSON.stringify({ prize }, undefined, 2),
                    },
                ]
                const branch_tree = { tree: '', items: [] }
                const blobs_data = await Promise.all(
                    blobs.map(async (blob) => {
                        return await _repo.getBlobPushDataOut(branch_tree.items, blob)
                    }),
                )

                // Create future tree
                const future_tree = await _repo.getTreePushDataOut(
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
                    `Initialize ${type}`,
                ]
                    .filter((item) => item !== null)
                    .join('\n')
                const commit_hash = sha1(commit_string, 'commit', 'sha1')
                const commit_parent = {
                    address: await _gosh.getCommitAddress({
                        repo_addr: _repo.getAddress(),
                        commit_name: ZERO_COMMIT,
                    }),
                    version: _repo.getVersion(),
                }

                // Update future tree
                future_tree.sha256 = await _repo.getTreeSha256Out({
                    items: future_tree.tree[''].map((item) => ({
                        ...item,
                        commit: commit_hash,
                    })),
                })

                // Deploy future commit and etc.
                await _repo.deployCommitOut(
                    branch_name,
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
                        await _repo.deployTreeOut(with_commit)
                    }),
                )
                await Promise.all(
                    blobs_data.flat().map(async ({ data }) => {
                        const { treepath, content } = data
                        await _repo.deploySnapshotOut(commit_hash, treepath, content)
                    }),
                )

                // Create cells for DAO multi event
                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Creating DAO event',
                }))
                event_cells.push(
                    {
                        type: EDaoEventType.BRANCH_CREATE,
                        params: {
                            repo_name: _repo.name,
                            branch_name,
                            from_commit: ZERO_COMMIT,
                            comment: 'Create hackathon branch',
                        },
                    },
                    { type: EDaoEventType.DELAY, params: {} },
                    {
                        type: EDaoEventType.PULL_REQUEST,
                        params: {
                            repo_name: _repo.name,
                            branch_name,
                            commit_name: commit_hash,
                            num_files: 0,
                            num_commits: 1,
                            comment: 'Initialize hackathon branch',
                        },
                    },
                    {
                        type: EDaoEventType.BRANCH_LOCK,
                        params: {
                            repo_name: _repo.name,
                            branch_name,
                            comment: `Protect hackathon branch`,
                        },
                    },
                    {
                        type: EDaoEventType.HACKATHON_CREATE,
                        params: {
                            name: hackathon_name,
                            metadata: {
                                branch_name,
                                dates,
                                description: description.brief,
                            },
                            prize_distribution: [],
                            prize_wallets: [],
                            expert_tags,
                            comment: `Create hackathon`,
                        },
                    },
                )
                const eventaddr = await member.wallet!.createMultiEvent({
                    proposals: event_cells,
                    comment: comment || `Create ${type}`,
                })
                setStatus((state) => ({
                    ...state,
                    type: 'success',
                    data: {
                        title: 'Create DAO event',
                        content: `Publish ${type} proposal created`,
                    },
                }))

                return { eventaddr }
            } catch (e: any) {
                setStatus((state) => ({ ...state, type: 'error', data: e }))
                throw e
            }
        },
        [dao.version, member.isReady],
    )

    return { create, status }
}

export function useDaoHackathonList(
    params: { count?: number; initialize?: boolean } = {},
) {
    const { count = 10, initialize } = params
    const { details: dao } = useDao()
    const [data, setData] = useRecoilState(daoHackathonListSelector(dao.name))

    const getBlockchainItems = async (params: {
        dao_name: string
        limit: number
        cursor?: string
    }) => {
        const { dao_name, limit, cursor } = params
        const sc = getSystemContract()
        const code_hash = await sc.getHackathonCodeHash(dao_name)
        const { results, lastId, completed } = await getPaginatedAccounts({
            filters: [`code_hash: {eq: "${code_hash}"}`],
            limit,
            lastId: cursor,
        })

        const items = await executeByChunk<{ id: string }, THackathonDetails>(
            results,
            MAX_PARALLEL_READ,
            async ({ id }) => {
                const account = await sc.getHackathon({ address: id })
                const { applications, ...rest } = await account.getDetails()

                return {
                    account,
                    address: account.address,
                    type: EHackathonType.HACKATHON,
                    storagedata: storagedata_empty,
                    apps_submitted: apps_submitted_empty,
                    apps_approved: applications,
                    ...rest,
                }
            },
        )
        return { items, cursor: lastId, has_next: !completed }
    }

    const getHackathonList = useCallback(async () => {
        try {
            if (!dao.name) {
                return
            }

            setData((state) => ({ ...state, is_fetching: true }))
            const blockchain = await getBlockchainItems({
                dao_name: dao.name!,
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
                                  storagedata: item.storagedata,
                                  apps_submitted: item.apps_submitted,
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
    }, [dao.name, count])

    const getNext = useCallback(async () => {
        try {
            setData((state) => ({ ...state, is_fetching: true }))
            const blockchain = await getBlockchainItems({
                dao_name: dao.name!,
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
    }, [dao.name, data.cursor])

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
    options: { initialize?: boolean; subscribe?: boolean; address?: string } = {},
) {
    const { initialize, subscribe } = options
    const url_params = useParams()
    const { user } = useUser()
    const member = useDaoMember()
    const address = options.address || url_params.address || ''
    const { details: dao } = useDao()
    const [hackathons, setHakathons] = useRecoilState(daoHackathonListSelector(dao.name))
    const hackathon = useRecoilValue(daoHackathonSelector(address))
    const [error, setError] = useState<any>()

    const getHackathon = useCallback(async () => {
        const sc = getSystemContract()

        if (!dao.name) {
            return
        }

        try {
            // Search for hackathon in hackathon list state atom
            let found = hackathons.items.find((item) => item.address === address)

            // Fetch hackathon's metadata from blockchain
            if (!found) {
                const account = await sc.getHackathon({ address })
                const { applications, ...rest } = await account.getDetails()

                found = {
                    account,
                    address: account.address,
                    type: EHackathonType.HACKATHON,
                    storagedata: storagedata_empty,
                    apps_submitted: apps_submitted_empty,
                    apps_approved: applications,
                    ...rest,
                }

                setHakathons((state) => {
                    const exists = state.items.find((v) => v.address === found!.address)
                    return {
                        ...state,
                        items: !exists ? [...state.items, found!] : state.items,
                    }
                })
            } else {
                await getDetails(found.account)
            }

            ////
            // TODO: Remove after git refactor
            const _gosh = GoshAdapterFactory.create(dao.version!)
            const _dao_adapter = await _gosh.getDao({ address: dao.address! })
            const _dao_details = await _dao_adapter.getDetails()
            const _repo_adapter = await _dao_adapter.getRepository({
                name: '_hackathons',
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

            // Fetch hackathon submitted apps
            if (!found.apps_submitted.is_fetching) {
                getApplications({
                    repo_address: found._rg_repo_adapter.getAddress(),
                    branch_name: found.metadata.branch_name,
                    hack_address: found.address,
                    applications: found.apps_approved,
                })
            }

            // Fetch hackathon storage data
            if (!found.storagedata.is_fetching) {
                getStorageData({
                    address: found.address,
                    repo: found._rg_repo_adapter,
                    branch_name: found.metadata.branch_name,
                })
            }
        } catch (e: any) {
            setError(e)
        }
    }, [dao.name, address, member.isMember, member.wallet?.address])

    const getDetails = async (account: Hackathon) => {
        try {
            const { applications, ...rest } = await account.getDetails()

            const now = moment().unix()
            const start = rest.metadata.dates.start
            const voting = rest.metadata.dates.voting || now + 1
            const finish = rest.metadata.dates.finish || now + 1
            const is_voting_created = !!applications.length

            const updated = {
                ...rest,
                apps_approved: applications,
                is_voting_started: now >= voting,
                is_voting_created,
                // TODO: Remove +10s and check finished by block time
                is_voting_finished: now >= finish + 10,
                is_update_enabled: !is_voting_created,
                is_participate_enabled: now >= start && now < voting,
            }

            setHakathons((state) => ({
                ...state,
                items: state.items.map((item) => {
                    if (item.address === account.address) {
                        return { ...item, ...updated }
                    }
                    return item
                }),
            }))
        } catch (e) {
            setError(e)
        }
    }

    const getStorageData = async (params: {
        address: string
        repo: IGoshRepositoryAdapter
        branch_name: string
    }) => {
        const { address, branch_name } = params

        try {
            setHakathons((state) => ({
                ...state,
                items: state.items.map((item) => {
                    if (item.address !== address) {
                        return item
                    }
                    return {
                        ...item,
                        storagedata: { ...item.storagedata, is_fetching: true },
                    }
                }),
            }))

            // Read files stored in repository
            let repo = params.repo
            const branch = await repo.getBranch(branch_name)
            const commit = await repo.getCommit({
                address: branch.commit.address,
            })
            const tree = await repo.getTree(commit, '')

            if (commit.version !== repo.getVersion()) {
                const _gosh = GoshAdapterFactory.create(commit.version)
                const repo_name = await repo.getName()
                repo = await _gosh.getRepository({
                    path: `${dao.name}/${repo_name}`,
                })
            }

            const snap_data = await Promise.all(
                tree.items.map(async (item) => {
                    const { value0 } = await repo.repo.runLocal(
                        'getSnapshotAddr',
                        { commitsha: item?.commit, name: item.name },
                        undefined,
                        { useCachedBoc: true },
                    )
                    const { current } = await repo.getCommitBlob(
                        value0,
                        item.name,
                        commit,
                    )
                    return { ...item, content: current }
                }),
            )

            // Create updated storage data
            const updated: any = {
                prize: { total: 0, places: [] },
                prize_raw: '',
                description: {},
            }
            for (const file of ['readme.md', 'rules.md', 'prizes.md', 'metadata.json']) {
                const item = snap_data.find((v) => v.name.toLowerCase() === file)
                if (!item) {
                    continue
                }

                if (!item.content || Buffer.isBuffer(item.content)) {
                    continue
                }

                if (file === 'metadata.json') {
                    const parsed = JSON.parse(item.content)
                    updated.prize = parsed.prize
                    updated.prize_raw = item.content
                } else {
                    const key = file.split('.')[0]
                    updated.description[key] = item.content
                }
            }

            // Update state
            setHakathons((state) => ({
                ...state,
                items: state.items.map((item) => {
                    if (item.address === address) {
                        return {
                            ...item,
                            storagedata: {
                                ...item.storagedata,
                                ...updated,
                                is_fetched: true,
                                is_fetching: false,
                            },
                        }
                    }
                    return item
                }),
            }))
        } catch (e: any) {
            setError(e)
        }
    }

    const getApplications = async (params: {
        repo_address: string
        branch_name: string
        hack_address: string
        applications: THackathonApplication[]
    }) => {
        const { repo_address, branch_name, hack_address, applications } = params

        try {
            setHakathons((state) => ({
                ...state,
                items: state.items.map((item) => ({
                    ...item,
                    apps_submitted: {
                        ...item.apps_submitted,
                        is_fetching: item.address === hack_address,
                    },
                })),
            }))

            const sc = getSystemContract()
            const code_hash = await sc.getHackathonAppIndexCodeHash({
                repo_address,
                branch_name,
            })
            const accounts = await getAllAccounts({
                filters: [`code_hash: {eq:"${code_hash}"}`],
            })
            const apps_submitted = await executeByChunk<
                { id: string },
                THackathonParticipant
            >(accounts, MAX_PARALLEL_READ, async ({ id }) => {
                const tag = await sc.getCommitTag({ address: id })
                const details = await tag.getDetails()
                const parsed = JSON.parse(details.content)

                const { sc: psc, dao_account } = await getApplicationVersion(
                    parsed.dao_name,
                )
                const is_member = user.profile
                    ? await dao_account.isMember(user.profile)
                    : false

                const prepo_account = (await psc.getRepository({
                    path: `${parsed.dao_name}/${parsed.repo_name}`,
                })) as unknown as GoshRepository
                const repo_details = await prepo_account.getDetails()

                return {
                    ...parsed,
                    dao_address: dao_account.address,
                    is_member,
                    description: repo_details.description,
                    application: applications.find((app) => {
                        return (
                            app.dao_name === parsed.dao_name &&
                            app.repo_name === parsed.repo_name
                        )
                    }),
                }
            })

            // Update state
            setHakathons((state) => ({
                ...state,
                items: state.items.map((item) => {
                    if (item.address === hack_address) {
                        return {
                            ...item,
                            apps_submitted: {
                                items: apps_submitted.map((app) => {
                                    const exists = item.apps_submitted.items.find((v) => {
                                        return (
                                            v.dao_name === app.dao_name &&
                                            v.repo_name === app.repo_name
                                        )
                                    })
                                    if (exists) {
                                        return { ...exists, ...app }
                                    }
                                    return app
                                }),
                                is_fetching: false,
                                is_fetched: true,
                            },
                        }
                    }
                    return item
                }),
            }))
        } catch (e: any) {
            setError(e)
        }
    }

    const getApplicationVersion = async (dao_name: string) => {
        const versions = AppConfig.getVersions({ reverse: true })
        const query = await Promise.all(
            Object.keys(versions).map(async (key) => {
                const sc = AppConfig.goshroot.getSystemContract(key)
                const dao_account = await sc.getDao({ name: dao_name })
                return {
                    sc,
                    dao_account,
                    deployed: await dao_account.isDeployed(),
                }
            }),
        )
        const latest = query.filter(({ deployed }) => !!deployed)[0]
        return { sc: latest.sc, dao_account: latest.dao_account as Dao }
    }

    useEffect(() => {
        if (initialize) {
            getHackathon()
        }
    }, [initialize, getHackathon])

    useEffect(() => {
        let interval: NodeJS.Timeout

        if (subscribe && hackathon?.address && hackathon._rg_repo_adapter) {
            interval = setLockableInterval(async () => {
                await getDetails(hackathon.account)
                await getStorageData({
                    address: hackathon.address,
                    repo: hackathon._rg_repo_adapter!,
                    branch_name: hackathon.metadata.branch_name,
                })
                await getApplications({
                    repo_address: hackathon._rg_repo_adapter!.getAddress(),
                    branch_name: hackathon.metadata.branch_name,
                    hack_address: hackathon.address,
                    applications: hackathon.apps_approved,
                })
            }, 20000)
        }

        return () => {
            clearInterval(interval)
        }
    }, [
        subscribe,
        hackathon?.address,
        hackathon?.metadata.branch_name,
        hackathon?.apps_approved.length,
        hackathon?._rg_repo_adapter?.getAddress(),
    ])

    return { hackathon, error, getApplications }
}

export function useUpdateHackathon() {
    const member = useDaoMember()
    const { hackathon } = useHackathon()
    const { push } = usePush(
        hackathon?._rg_dao_details!,
        hackathon?._rg_repo_adapter!,
        hackathon?.metadata.branch_name,
    )
    const { beforeCreateEvent } = useDaoHelpers()
    const [status, setStatus] = useRecoilState(
        appToastStatusSelector('__updatehackathondetails'),
    )

    const updateStorageData = useCallback(
        async (params: {
            filename: string
            content: { original: string; modified: string }
        }) => {
            // TODO: repo_name should be used after git part refactor
            const { filename, content } = params

            try {
                if (!hackathon?.is_update_enabled) {
                    throw new GoshError('Value error', 'Update details time expired')
                }

                await beforeCreateEvent(0, { onPendingCallback: setStatus })

                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: `Updating ${hackathon.type} data`,
                }))

                // TODO: Remove after git refactor
                const _tbranch = await hackathon?._rg_repo_adapter?.getBranch(
                    hackathon.metadata.branch_name,
                )
                const event_address = await push(
                    `Update details for ${hackathon?.name} ${hackathon?.type}`,
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
                        title: 'Create DAO event',
                        content: `Update ${hackathon?.type} data event created`,
                    },
                }))

                return { event_address }
            } catch (e) {
                setStatus((state) => ({ ...state, type: 'error', data: e }))
                throw e
            }
        },
        [
            member.isReady,
            hackathon?.is_update_enabled,
            hackathon?.metadata.branch_name,
            hackathon?._rg_dao_details?.isAuthMember,
            hackathon?._rg_repo_adapter?.auth?.username,
        ],
    )

    const updateMetadata = useCallback(
        async (params: {
            dates?: THackathonDetails['metadata']['dates']
            description?: string
            expert_tags?: string[]
        }) => {
            const { dates, description, expert_tags } = params

            try {
                if (!hackathon?.is_update_enabled) {
                    throw new GoshError('Value error', 'Update hackathon time expired')
                }
                if (!dates && description === undefined && expert_tags === undefined) {
                    throw new GoshError('Value error', 'Nothing was changed')
                }

                // Prepare balance for create event (member wallet is checked here)
                await beforeCreateEvent(20, { onPendingCallback: setStatus })

                const updated_metadata = { ...hackathon.metadata }
                if (description) {
                    updated_metadata.description = description
                }
                if (dates) {
                    updated_metadata.dates = dates
                }

                // Create cells for DAO multi event
                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Creating DAO event',
                }))
                const event_address = await member.wallet!.updateHackathon({
                    name: hackathon.name,
                    metadata: updated_metadata,
                    expert_tags,
                    comment: `Update ${hackathon.type}`,
                })
                setStatus((state) => ({
                    ...state,
                    type: 'success',
                    data: {
                        title: 'Create DAO event',
                        content: `Update ${hackathon.type} proposal created`,
                    },
                }))

                return { event_address }
            } catch (e: any) {
                setStatus((state) => ({ ...state, type: 'error', data: e }))
                throw e
            }
        },
        [member.isReady, hackathon?.is_update_enabled],
    )

    return { updateStorageData, updateMetadata, status }
}

export function useSubmitHackathonApps() {
    const member = useDaoMember()
    const { hackathon, getApplications } = useHackathon()
    const [status, setStatus] = useRecoilState(
        appToastStatusSelector('__addhackathonparticipants'),
    )

    const submitApps = async (params: {
        items: { dao_name: string; repo_name: string }[]
    }) => {
        const { items } = params

        try {
            if (!member.wallet) {
                throw new GoshError('Value error', 'User wallet undefined')
            }
            if (!hackathon?.name || !hackathon._rg_repo_adapter) {
                throw new GoshError('Value error', 'Hackathon repository undefined')
            }
            if (!hackathon.is_participate_enabled) {
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
                        reponame: '_hackathons',
                        name: tag_name,
                        content: JSON.stringify(item),
                        commit: {
                            address: `0:${new Array(64).fill(0).join('')}`,
                            name: ZERO_COMMIT,
                        },
                        is_hack: true,
                        branch_name: hackathon.metadata.branch_name,
                    })
                }),
            )
            await getApplications({
                repo_address: hackathon._rg_repo_adapter.getAddress(),
                branch_name: hackathon.metadata.branch_name,
                hack_address: hackathon.address,
                applications: hackathon.apps_approved,
            })

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

    return { submitApps, status }
}

export function useHackathonVoting() {
    const { user } = useUser()
    const { details: dao } = useDao()
    const { beforeCreateEvent } = useDaoHelpers()
    const member = useDaoMember()
    const { hackathon } = useHackathon()
    const setHakathons = useSetRecoilState(daoHackathonListSelector(dao.name))
    const setStatus0 = useSetRecoilState(
        appToastStatusSelector('__createhackathonvoting'),
    )
    const setStatus1 = useSetRecoilState(
        appToastStatusSelector('__submithackathonvoting'),
    )

    const checked_apps =
        hackathon?.apps_submitted.items.filter(({ is_selected }) => !!is_selected) || []

    useEffect(() => {
        if (hackathon?.address && user.profile) {
            setHakathons((state) => ({
                ...state,
                items: state.items.map((item) => {
                    if (item.address !== hackathon.address) {
                        return item
                    }

                    const user_karma_rest = item.members_karma_rest[user.profile!] || 0
                    const user_karma_added: any = []
                    item.apps_submitted.items.forEach((app) => {
                        const value = app.application?.members_karma_voted[user.profile!]
                        user_karma_added.push({
                            dao_name: app.dao_name,
                            repo_name: app.repo_name,
                            value: value || 0,
                            value_dirty: value ? value.toString() : '',
                            index: app.application?.index,
                        })
                    })

                    return {
                        ...item,
                        member_voting_state: {
                            karma_rest: user_karma_rest,
                            karma_rest_dirty: user_karma_rest,
                            karma_added: user_karma_added,
                        },
                    }
                }),
            }))
        }
    }, [
        hackathon?.address,
        user.profile,
        hackathon?.apps_submitted.items.length,
        hackathon?.apps_approved.length,
    ])

    const selectAppToApprove = (params: {
        dao_name: string
        repo_name: string
        is_selected: boolean
    }) => {
        const { dao_name, repo_name, is_selected } = params
        setHakathons((state) => ({
            ...state,
            items: state.items.map((item) => {
                if (item.address !== hackathon?.address) {
                    return item
                }

                return {
                    ...item,
                    apps_submitted: {
                        ...item.apps_submitted,
                        items: item.apps_submitted.items.map((app) => {
                            if (
                                app.dao_name === dao_name &&
                                app.repo_name === repo_name
                            ) {
                                return { ...app, is_selected }
                            }
                            return app
                        }),
                    },
                }
            }),
        }))
    }

    const updateAppKarma = (params: {
        dao_name: string
        repo_name: string
        value: string
        validate?: boolean
    }) => {
        const { dao_name, repo_name, validate = true } = params

        setHakathons((state) => ({
            ...state,
            items: state.items.map((item) => {
                if (item.address !== hackathon?.address || !item.member_voting_state) {
                    return item
                }

                const app_changed = item.member_voting_state.karma_added.find((app) => {
                    return app.dao_name === dao_name && app.repo_name === repo_name
                })!
                const value_int = parseInt(params.value) || app_changed.value
                const value_diff = value_int - app_changed.value

                // Sum all dirty karma except changed app
                const { karma_rest } = item.member_voting_state
                const karma_dirty_other = _.sum(
                    item.member_voting_state.karma_added
                        .filter((app) => {
                            const key = `${app.dao_name}/${app.repo_name}`
                            const cmp = `${dao_name}/${repo_name}`
                            return key !== cmp
                        })
                        .map(({ value, value_dirty }) => {
                            const dirty = value_dirty ? parseInt(value_dirty) : 0
                            return dirty - value
                        }),
                )

                let karma_rest_dirty = karma_rest - karma_dirty_other - value_diff
                if (validate) {
                    if (value_int < app_changed.value) {
                        return item
                    }
                    if (karma_rest_dirty < 0) {
                        karma_rest_dirty = karma_rest - karma_dirty_other
                        params.value = app_changed.value.toString()
                    }
                }

                return {
                    ...item,
                    member_voting_state: {
                        ...item.member_voting_state,
                        karma_rest_dirty,
                        karma_added: item.member_voting_state.karma_added.map((app) => {
                            if (
                                app.dao_name !== dao_name ||
                                app.repo_name !== repo_name
                            ) {
                                return app
                            }
                            return { ...app, value_dirty: params.value }
                        }),
                    },
                }
            }),
        }))
    }

    const approveApps = async () => {
        try {
            if (checked_apps.length === 0) {
                throw new GoshError('Value error', 'No applications selected for voting')
            }
            if (!hackathon) {
                throw new GoshError('Value error', 'Hackathon is undefined')
            }

            await beforeCreateEvent(20, { onPendingCallback: setStatus0 })

            setStatus0((state) => ({
                ...state,
                type: 'pending',
                data: 'Create DAO event',
            }))
            const event_address = await member.wallet!.approveHackathonApps({
                name: hackathon.name,
                applications: checked_apps.map((app) => ({
                    dao_address: app.dao_address,
                    dao_name: app.dao_name,
                    repo_name: app.repo_name,
                })),
                finish: hackathon.metadata.dates.finish,
                comment: 'Start hackathon voting',
            })
            setStatus0((state) => ({
                ...state,
                type: 'success',
                data: {
                    title: 'Create DAO event',
                    content: 'Start hackathon voting proposal created',
                },
            }))

            return { event_address }
        } catch (e) {
            setStatus0((state) => ({ ...state, type: 'error', data: e }))
            throw e
        }
    }

    const voteForApps = async () => {
        try {
            if (!member.wallet) {
                throw new GoshError('Value error', 'DAO wallet is undefined')
            }
            if (!hackathon?.member_voting_state) {
                throw new GoshError('Value error', 'Hackathon data is undefined')
            }

            const params = hackathon.member_voting_state.karma_added
                .filter((item) => {
                    const value_dirty = parseInt(item.value_dirty || '0')
                    return value_dirty - item.value > 0
                })
                .map((item) => ({
                    hack_name: hackathon.name,
                    app_index: item.index,
                    value: parseInt(item.value_dirty) - item.value,
                }))

            if (params.length === 0) {
                throw new GoshError('Value error', 'Nothing was changed')
            }

            setStatus1((state) => ({
                ...state,
                type: 'pending',
                data: 'Submitting votes',
            }))
            await Promise.all(
                params.map(async (item) => {
                    await member.wallet!.voteForHackathonApp(item)
                }),
            )
            setStatus1((state) => ({
                ...state,
                type: 'success',
                data: 'Votes successfuly submitted',
            }))
        } catch (e) {
            setStatus1((state) => ({ ...state, type: 'error', data: e }))
            throw e
        }
    }

    return {
        checked_apps,
        selectAppToApprove,
        approveApps,
        updateAppKarma,
        voteForApps,
    }
}

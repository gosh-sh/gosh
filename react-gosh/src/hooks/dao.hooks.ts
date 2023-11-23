import { useCallback, useEffect, useState } from 'react'
import { useRecoilState } from 'recoil'
import { executeByChunk, getAllAccounts } from '../helpers'
import { daoAtom } from '../store'
import {
    ESmvEventType,
    TAddress,
    TDaoCreateProgress,
    TDaoListItem,
    TDaoMemberAllowanceUpdateParams,
    TDaoMemberCreateParams,
    TDaoMemberDeleteParams,
    TDaoMemberDetails,
    TDaoMintTokenParams,
    TDaoVotingTokenAddParams,
    TTaskDetails,
    TTaskListItem,
    TTopic,
    TTopicCreateParams,
    TUserParam,
} from '../types'
import { EGoshError, GoshError } from '../errors'
import { AppConfig } from '../appconfig'
import { useProfile, useUser } from './user.hooks'
import {
    IGoshDaoAdapter,
    IGoshProfile,
    IGoshRepositoryAdapter,
    IGoshSmvAdapter,
    IGoshWallet,
} from '../gosh/interfaces'
import { GoshAdapterFactory } from '../gosh'
import {
    DAO_TOKEN_TRANSFER_TAG,
    MAX_PARALLEL_READ,
    SYSTEM_TAG,
    VESTING_BALANCE_TAG,
} from '../constants'
import { KeyPair } from '@eversdk/core'

function useDaoList(perPage: number) {
    const profile = useProfile()
    const [search, setSearch] = useState<string>('')
    const [daos, setDaos] = useState<{
        items: TDaoListItem[]
        filtered: { search: string; items: string[] }
        page: number
        isFetching: boolean
    }>({
        items: [],
        filtered: { search: '', items: [] },
        page: 1,
        isFetching: true,
    })

    /** Get next chunk of DAO list items */
    const getMore = () => {
        setDaos((state) => ({ ...state, page: state.page + 1 }))
    }

    /** Load item details and update corresponging list item */
    const setItemDetails = async (item: TDaoListItem) => {
        if (item.isLoadDetailsFired) return

        setDaos((state) => ({
            ...state,
            items: state.items.map((curr) => {
                if (curr.address === item.address) {
                    return { ...curr, isLoadDetailsFired: true }
                }
                return curr
            }),
        }))

        const details = await item.adapter.getDetails()
        setDaos((state) => ({
            ...state,
            items: state.items.map((curr) => {
                if (curr.address === item.address) return { ...curr, ...details }
                return curr
            }),
        }))
    }

    /** Get initial DAO list */
    useEffect(() => {
        const _getDaoList = async () => {
            if (!profile) return

            // Get DAO details (prepare DAO list items)
            const adapters = await profile.getDaos()
            const dirty = await executeByChunk(
                adapters,
                MAX_PARALLEL_READ,
                async (adapter) => ({
                    adapter,
                    address: adapter.getAddress(),
                    name: await adapter.getName(),
                    version: adapter.getVersion(),
                }),
            )

            const clean: TDaoListItem[] = []
            dirty.forEach((item) => {
                const { name, version } = item
                const index = clean.findIndex((a) => a.name === name)

                if (index < 0) {
                    clean.push(item)
                } else if (clean[index].version < version) {
                    clean[index] = item
                }
            })

            setDaos((state) => {
                const merged = [...state.items, ...clean]
                return {
                    items: merged.sort((a, b) => (a.name > b.name ? 1 : -1)),
                    filtered: { search: '', items: merged.map((item) => item.address) },
                    page: 1,
                    isFetching: false,
                }
            })
        }

        _getDaoList()
    }, [profile])

    /** Update filtered items and page depending on search */
    useEffect(() => {
        setDaos((state) => {
            return {
                ...state,
                page: search ? 1 : state.page,
                filtered: {
                    search,
                    items: state.items
                        .filter((item) => _searchItem(search, item.name))
                        .map((item) => item.address),
                },
            }
        })
    }, [search])

    const _searchItem = (what: string, where: string): boolean => {
        const pattern = new RegExp(`^${what}`, 'i')
        return !what || where.search(pattern) >= 0
    }

    return {
        isFetching: daos.isFetching,
        isEmpty: !daos.isFetching && !daos.filtered.items.length,
        items: daos.items
            .filter((item) => daos.filtered.items.indexOf(item.address) >= 0)
            .slice(0, daos.page * perPage),
        hasNext: daos.page * perPage < daos.filtered.items.length,
        search,
        setSearch,
        getMore,
        getItemDetails: setItemDetails,
    }
}

function useDao(name: string) {
    const [details, setDetails] = useRecoilState(daoAtom)
    const [adapter, setAdapter] = useState<IGoshDaoAdapter>()
    const [isFetching, setIsFetching] = useState<boolean>(true)
    const [errors, setErrors] = useState<string[]>([])

    const updateDetails = useCallback(async () => {
        if (!adapter) {
            return adapter
        }

        const details = await adapter.getDetails()
        setDetails(details)
    }, [adapter])

    useEffect(() => {
        const _getDao = async () => {
            let instance: IGoshDaoAdapter | undefined
            for (const version of Object.keys(AppConfig.versions).reverse()) {
                const gosh = GoshAdapterFactory.create(version)
                const check = await gosh.getDao({ name })
                if (await check.isDeployed()) {
                    instance = check
                    break
                }
            }

            if (instance) {
                const details = await instance.getDetails()
                setDetails(details)
                setAdapter(instance)
            } else {
                setErrors((state) => [...state, 'DAO not found'])
            }
            setIsFetching(false)
        }

        _getDao()
    }, [name])

    // useEffect(() => {
    //     let _intervalLock = false
    //     const interval = setInterval(async () => {
    //         if (!_intervalLock) {
    //             _intervalLock = true
    //             await updateDetails()
    //             _intervalLock = false
    //         }
    //     }, 10000)

    //     return () => {
    //         clearInterval(interval)
    //     }
    // }, [updateDetails])

    // useEffect(() => {
    //     const _checkPaidMembership = async () => {
    //         if (!adapter?.wallet || !details?.members.length) {
    //             return
    //         }

    //         const now = Math.round(Date.now() / 1000)
    //         const anyExpired = details.members.filter(({ expired = 0 }) => {
    //             return expired > 0 && now > expired
    //         })
    //         if (anyExpired.length) {
    //             adapter.wallet.run('startCheckPaidMembership', {})
    //         }
    //     }

    //     _checkPaidMembership()
    // }, [details?.members, adapter?.wallet])

    return {
        adapter,
        details,
        errors,
        isFetching,
        updateDetails,
    }
}

function useDaoCreate() {
    const profile = useProfile()
    const { user } = useUser()
    const [progress, setProgress] = useState<TDaoCreateProgress>({
        isFetching: false,
    })

    // Get latest supported GOSH version
    const gosh = GoshAdapterFactory.createLatest()
    const version = gosh.getVersion()

    const _create_1_0_0 = async (name: string, options: { members?: string[] }) => {
        // Set initial progress
        setProgress({ isFetching: true })

        // Deploy dao
        let dao: IGoshDaoAdapter
        let isDaoDeployed: boolean
        try {
            if (!profile) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

            const usernames = (options.members || []).filter((item) => !!item)
            const profiles = await gosh.isValidProfile(usernames)
            const addresses = profiles.map(({ address }) => address)
            dao = await profile.deployDao(gosh, name, [profile.address, ...addresses])
            isDaoDeployed = true
        } catch (e) {
            isDaoDeployed = false
            throw e
        } finally {
            setProgress((state) => ({ ...state, isDaoDeployed }))
        }

        // Set progress
        setProgress((state) => ({ ...state, isFetching: false }))
        return dao
    }

    const _create_2_0_0 = async (
        name: string,
        options: {
            tags?: string[]
            description?: string
            supply?: number
            mint?: boolean
            auth?: {
                profile: IGoshProfile
                username: string
                keys: KeyPair
            }
        },
    ) => {
        const { tags, description, supply, mint, auth } = options

        const _profile = profile || auth?.profile
        const _keys = user.keys || auth?.keys
        const _username = user.username || auth?.username
        if (!_profile || !_keys || !_username) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }

        // Set initial progress
        setProgress({ isFetching: true })

        // Deploy DAO
        let dao: IGoshDaoAdapter
        try {
            dao = await _profile.deployDao(gosh, name, [_profile.address])
            setProgress((state) => ({ ...state, isDaoDeployed: true }))
        } catch (e) {
            setProgress((state) => ({ ...state, isDaoDeployed: false }))
            throw e
        }

        // Authorize DAO
        try {
            await dao.setAuth(_username, _keys)
            setProgress((state) => ({ ...state, isDaoAuthorized: true }))
        } catch (e) {
            setProgress((state) => ({ ...state, isDaoAuthorized: false }))
            throw e
        }

        // Setup total supply and minting policy
        try {
            if (supply && supply > 20) {
                await dao.mint({ amount: supply - 20, alone: true })
            }
            if (mint === false) {
                await dao.disableMint({ alone: true })
            }
            setProgress((state) => ({ ...state, isTokenSetup: true }))
        } catch (e) {
            setProgress((state) => ({ ...state, isTokenSetup: false }))
            throw e
        }

        // Deploy DAO tags
        try {
            const cleanTags = (tags || []).filter((item) => !!item)
            if (cleanTags.length) {
                await dao.createTag({ tags: cleanTags, alone: true })
            }
            setProgress((state) => ({ ...state, isTagsDeployed: true }))
        } catch {
            setProgress((state) => ({ ...state, isTagsDeployed: false }))
        }

        // Deploy DAO service repository
        let repo: IGoshRepositoryAdapter
        try {
            repo = (await dao.createRepository({
                name: '_index',
                description: 'DAO system repository',
                alone: true,
            })) as IGoshRepositoryAdapter
            setProgress((state) => ({ ...state, isRepositoryDeployed: true }))
        } catch (e) {
            setProgress((state) => ({ ...state, isRepositoryDeployed: false }))
            throw e
        }

        // Push description blob to DAO service repository
        if (description) {
            try {
                const blobs = [
                    {
                        treepath: ['', 'description.txt'],
                        original: '',
                        modified: description,
                    },
                ]
                await repo.push('main', blobs, 'Initial commit', false, {})
                setProgress((state) => ({ ...state, isBlobsDeployed: true }))
            } catch (e) {
                setProgress((state) => ({ ...state, isBlobsDeployed: false }))
            }
        } else {
            setProgress((state) => ({ ...state, isBlobsDeployed: true }))
        }

        // Set upgrade repos flag
        await dao.setRepositoriesUpgraded()

        // Set progress
        setProgress((state) => ({ ...state, isFetching: false }))
        return dao
    }

    // Resolve create fn
    let createFn = null
    if (version === '1.0.0') {
        createFn = _create_1_0_0
    } else {
        createFn = _create_2_0_0
    }

    return { progress, create: createFn }
}

function useDaoUpgrade(dao: IGoshDaoAdapter) {
    const [versions, setVersions] = useState<string[]>()

    useEffect(() => {
        const _getAvailableVersions = () => {
            const all = Object.keys(AppConfig.versions)
            const currIndex = all.findIndex((v) => v === dao.getVersion())
            setVersions(all.slice(currIndex + 1))
        }

        _getAvailableVersions()
    }, [dao])

    const upgrade = async (version: string, comment?: string) => {
        if (Object.keys(AppConfig.versions).indexOf(version) < 0) {
            throw new GoshError(`Gosh version ${version} is not supported`)
        }
        await dao.upgrade({ version, description: comment })
    }

    return { versions, upgrade }
}

function useVestingBalance(dao?: IGoshDaoAdapter) {
    const { user } = useUser()
    const [balance, setBalance] = useState<number>(0)

    const getTagName = () => {
        return `${VESTING_BALANCE_TAG}:${user.username}`
    }

    const getTag = async () => {
        if (!dao || dao.getVersion() < '4.0.0') {
            return null
        }

        const gosh = dao.getGosh()
        const tagName = getTagName()
        if (dao.getVersion() === '4.0.0') {
            const repo = await dao.getRepository({ name: VESTING_BALANCE_TAG })
            const { value0: code } = await gosh.goshroot.runLocal('getTagCode', {
                tagcode:
                    'te6ccgECKgEABn0ABCSK7VMg4wMgwP/jAiDA/uMC8gsnAwEpA+DtRNDXScMB+GaJ+Gkh2zzTAAGOIoMI1xgg+CjIzs7J+QAB0wABlNP/AwGTAvhC4iD4ZfkQ8qiV0wAB8nriUzDTPzMwIdMfMyD4I7zy4Pog+COBASygtR+58uD7IfkAIfhKgCD0Dm+hlPQFbwHeIG4gDgwCAUqOEDBcbyGDB/QOb5GT1woA3rPf8uD8UxJvAvhrXwTTHwHbPPI8BANS7UTQ10nDAfhmItDTA/pAMPhpqTgA3CHHAOMCIdcNH/K8IeMDAds88jwmJgQDPCCCED/YVlW74wIgghBcWupCu+MCIIIQYSSk+brjAhMHBQNmMPhG8uBM+EJu4wDR2zwhjhsj0NMB+kAwMcjPhyDOghDhJKT5zwuBzMlw+wCRMOLjAPIAJQYjAAT4TwRQIIIQSUkuMLrjAiCCEEuM0oO64wIgghBQhNyVuuMCIIIQXFrqQrrjAhEPCggDODD4RvLgTPhCbuMAIZPU0dDe+kDTf9HbPNs88gAlCSMCVHP4Vnj0D46BiN/4UvhTVRLbPPhJxwXy4NL4UsjPhQjOgG/PQMmBAKD7ACkZBOIw+EJu4wD4RvJzIZPU0dDe+kDU1NHQ+kDU1NHQ+kDU0dD6QNTU1NN/0fhFIG6SMHDe+EK68uDU+E35AIj5AL3y4NP4AAFz+FZ49Bf4dlUD+HJVAvhzVQX4cVj4dAH4dXP4Vnj0D46BiN/4UvhT+FFVAwwpKQsCKts8+EnHBfLg0lj4bgH4cPhv2zzyABkjAhbtRNDXScIBjoDjDQ0lBIxw7UTQ9AVtcCBvAnBxJIBA9A+OgYjfiCCJXzCIIG34dvh1+HT4c/hy+HH4cPhv+G74bfhs+Gv4aoBA9A7yvdcL//hicPhjKSkOKQBDgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAMkMPhG8uBM+EJu4wDR2zzjAPIAJRAjAJJopv5gghAdzWUAvvLgzPhU+E/4TvhQ+E34ScjPhYjOgoAgL68IAAAAAAAAAAAAAAAAAAHPC45VQMjPkWox2LbMzszMzM3JcfsAA3ow+Eby4Ez4Qm7jANHbPCWOJCfQ0wH6QDAxyM+HIM5xzwthXkDIz5MlJLjCzM7MzMzNyXD7AJJfBeLjAPIAJRIjABT4TfhQ+E74T/hUBFAgghAZsfAJuuMCIIIQHqUXXbrjAiCCECV4DfK64wIgghA/2FZVuuMCIiAXFAJkMPhG8uBM0ds8Io4fJNDTAfpAMDHIz4cgzoBiz0BeAc+S/2FZVszMyXD7AJFb4uMA8gAVIwIEiIgWHwAGdGFnAzow+Eby4Ez4Qm7jACGT1NHQ3vpA03/U0ds84wDyACUYIwK4c/hWePQPjoGI3/hS+FNVE9s8+EnHBfLg0vhP+FD4TvhN+FT4VfhSyM+FiM6CgCBfXhAAAAAAAAAAAAAAAAAAAc8LjlVgyM+QUpfQGszMzFUwyMzOzMzNzclx+wApGQKOVQNYiNs8cMjL/3BtgED0Q1UDc1iAQPQWVQJxWIBA9BZYyMt/cliAQPRDyPQAyQHIz4SA9AD0AM+ByfkAcMjPhkDKB8v/ydAfGgEmAcjOzCDJ+QDIMs8L/wHQAcnbPBsCFiGLOK2zWMcFioriHRwBCAHbPMkeASYB1NQwEtDbPMjPjits1hLMzxHJHgF21YsvSkDXJvQE0wkxINdKkdSOgogB4otfS98sBOjXJjAByM+L0pD0AIAgzwsJz5fS98sBOswSzMjPEc4pAAo0LjAuMANuMPhG8uBM+EJu4wDR2zwhjh8j0NMB+kAwMcjPhyDOcc8LYQHIz5J6lF12zs3JcPsAkTDi4wDyACUhIwAE+FEDbjD4RvLgTPhCbuMA0ds8IY4fI9DTAfpAMDHIz4cgznHPC2EByM+SZsfAJs7NyXD7AJEw4uMA8gAlJCMAlvhW+FX4VPhT+FL4UfhQ+E/4TvhN+Ez4S/hK+ELIy//Pg/QAAW8iAsv/yx/L/8zMVXDIzM5VUMjOVUDIzlUwyM7MzPQAzc3NzcntVAAE+FAAmO1E0NP/0wAx9ATT/9MfWW8CAdP/1NTU0dDU+kDU0dD6QNTR0PpA1NHQ+kDU1PQE0fh2+HX4dPhz+HL4cfhw+G/4bvht+Gz4a/hq+GIACvhG8uBMAhD0pCD0vfLATikoABRzb2wgMC42Ny4wAAA=',
                repo: repo.getAddress(),
                ver: '4.0.0',
            })
            const { hash } = await dao.dao.account.client.boc.get_boc_hash({ boc: code })
            const accounts = await getAllAccounts({
                filters: [`code_hash: {eq:"${hash}"}`],
            })

            const details = await executeByChunk(
                accounts,
                MAX_PARALLEL_READ,
                async ({ id }) => {
                    const tag = await gosh.getCommitTag({ address: id })
                    const data = await tag.runLocal('getDetails', {})
                    return { address: id, ...data }
                },
            )

            const found = details.find(({ value0 }) => value0 === tagName)
            if (found) {
                return await gosh.getCommitTag({ address: found.address })
            }
            return null
        } else {
            return await gosh.getCommitTag({
                data: {
                    daoName: await dao.getName(),
                    repoName: VESTING_BALANCE_TAG,
                    tagName,
                },
            })
        }
    }

    const getStoredBalance = async () => {
        const tag = await getTag()
        console.debug('TAG', tag)
        if (!tag || !(await tag.isDeployed())) {
            return 0
        }

        const { value0 } = await tag.runLocal('getContent', {})
        return parseInt(value0)
    }

    const updateBalance = async () => {
        if (!dao || !user.profile || !user.username || dao.getVersion() < '4.0.0') {
            return
        }

        // Get stored balance
        const stored = await getStoredBalance()
        setBalance(stored)

        // Get all DAO tasks
        const gosh = dao.getGosh()
        const codeHash = await gosh.getTaskTagDaoCodeHash(dao.getAddress(), SYSTEM_TAG)
        const result = await getAllAccounts({
            filters: [`code_hash: {eq:"${codeHash}"}`],
        })
        const tasks = await executeByChunk(result, 30, async ({ id }) => {
            const tag = await gosh.getHelperTag(id)
            const { _task } = await tag.runLocal('_task', {})
            const task = await dao.getTaskAccount({ address: _task })
            return await task.runLocal('getStatus', {})
        })

        // Calculate balance
        let _balance = 0
        for (const task of tasks) {
            if (task.candidates.length === 0) {
                continue
            }

            const assigners = Object.keys(task.candidates[0].pubaddrassign)
            const reviewers = Object.keys(task.candidates[0].pubaddrreview)
            const managers = Object.keys(task.candidates[0].pubaddrmanager)

            if (assigners.indexOf(user.profile) >= 0) {
                for (const { grant } of task.grant.assign) {
                    _balance += Math.floor(parseInt(grant) / assigners.length)
                }
            }
            if (reviewers.indexOf(user.profile) >= 0) {
                for (const { grant } of task.grant.review) {
                    _balance += Math.floor(parseInt(grant) / reviewers.length)
                }
            }
            if (managers.indexOf(user.profile) >= 0) {
                for (const { grant } of task.grant.manager) {
                    _balance += Math.floor(parseInt(grant) / managers.length)
                }
            }
        }
        setBalance(_balance)

        // Update tag
        const tag = await getTag()
        if (tag && (await tag.isDeployed()) && stored !== _balance) {
            await dao.wallet?.run('deleteTag', {
                repoName: VESTING_BALANCE_TAG,
                nametag: getTagName(),
            })
        }
        if (!tag || !(await tag.isDeployed())) {
            await dao.wallet?.run('deployTag', {
                repoName: VESTING_BALANCE_TAG,
                nametag: getTagName(),
                nameCommit: user.username,
                commit: user.profile,
                content: _balance.toString(),
            })
        }
    }

    useEffect(() => {
        updateBalance()

        let isIntervalBusy = false
        const interval = setInterval(async () => {
            if (isIntervalBusy) {
                return
            }

            isIntervalBusy = true
            try {
                await updateBalance()
            } catch (e: any) {
                console.error(e.message)
            }
            isIntervalBusy = false
        }, 120000)

        return () => {
            clearInterval(interval)
        }
    }, [dao?.getAddress()])

    return balance
}

function useDaoAutoTokenTransfer(dao?: IGoshDaoAdapter) {
    const { user } = useUser()

    const getUntransferredTokens = async (
        _ver: string,
        _smv: IGoshSmvAdapter,
        _wallet: IGoshWallet,
    ) => {
        if (_ver < '3.0.0') {
            const { smvAvailable, smvLocked, smvBalance } = await _smv.getDetails(_wallet)
            return Math.max(smvAvailable, smvLocked) + smvBalance
        } else {
            const { m_pseudoDAOBalance } = await _wallet.runLocal(
                'm_pseudoDAOBalance',
                {},
            )
            const { _lockedBalance } = await _wallet.runLocal('_lockedBalance', {})
            return parseInt(m_pseudoDAOBalance) + parseInt(_lockedBalance)
        }
    }

    const transferTokens = async (
        _dao: IGoshDaoAdapter,
        _profile: string,
        _to_dao_ver: string,
    ) => {
        const wallet = await _dao.getMemberWallet({ profile: _profile })
        if (!(await wallet.isDeployed())) {
            return 0
        }

        const version = _dao.getVersion()
        const smv = await _dao.getSmv()
        const untransferred = await getUntransferredTokens(version, smv, wallet)
        if (untransferred > 0) {
            await smv.releaseAll()
            await smv.transferToWallet(0)
            await _dao.wallet?.run('sendTokenToNewVersion', {
                grant: untransferred,
                newversion: _to_dao_ver,
            })
        }
        return untransferred
    }

    const checkTokens = async () => {
        try {
            const { username, profile, keys } = user
            const stopTransferTagName = `${DAO_TOKEN_TRANSFER_TAG}:${username}`
            if (!profile || !username || !keys || !dao) {
                return { retry: true }
            }
            if (dao.getVersion() < '5.0.0') {
                return { retry: false }
            }
            if (!(await dao.wallet?.isDeployed())) {
                return { retry: true }
            }

            // Check for stop transfer tag
            const stopTransferTag = await dao.getGosh().getCommitTag({
                data: {
                    daoName: await dao.getName(),
                    repoName: DAO_TOKEN_TRANSFER_TAG,
                    tagName: stopTransferTagName,
                },
            })
            // if (await stopTransferTag.isDeployed()) {
            //     return { retry: false }
            // }

            // Transfer tokens from all prev dao versions
            let untransferred = 0
            let prevDao = await dao.getPrevDao()
            while (prevDao) {
                if (prevDao.getVersion() === '1.0.0') {
                    break
                }
                await prevDao.setAuth(username, keys)
                untransferred += await transferTokens(prevDao, profile, dao.getVersion())
                prevDao = await prevDao.getPrevDao()
            }

            // Deploy stop transfer tag
            if (untransferred === 0) {
                // await dao.wallet?.run('deployTag', {
                //     repoName: DAO_TOKEN_TRANSFER_TAG,
                //     nametag: stopTransferTagName,
                //     nameCommit: username,
                //     commit: profile,
                //     content: '',
                // })
                return { retry: false }
            }
            return { retry: true }
        } catch (e: any) {
            console.error(e.message)
            return { retry: true }
        }
    }

    useEffect(() => {
        let isIntervalBusy = false
        const interval = setInterval(async () => {
            if (isIntervalBusy) {
                return
            }

            isIntervalBusy = true
            const { retry } = await checkTokens()
            isIntervalBusy = false
            if (!retry) {
                clearInterval(interval)
            }
        }, 10000)

        return () => {
            clearInterval(interval)
        }
    }, [dao?.getAddress()])
}

function useDaoMemberList(dao: IGoshDaoAdapter, perPage: number) {
    const [search, setSearch] = useState<string>('')
    const [members, setMembers] = useState<{
        items: TDaoMemberDetails[]
        filtered: string[]
        page: number
        isFetching: boolean
    }>({
        items: [],
        filtered: [],
        page: 1,
        isFetching: true,
    })

    /** Get next chunk of DAO member list items */
    const getMore = () => {
        setMembers((state) => ({ ...state, page: state.page + 1 }))
    }

    const _getMemberList = useCallback(async () => {
        let items: TDaoMemberDetails[] = []

        const version = dao.getVersion()
        if (version === '1.0.0') {
            items = await _getMemberList_1_0_0()
        } else if (version < '4.0.0') {
            items = await _getMemberList_2_0_0()
        } else if (version < '5.0.0') {
            items = await _getMemberList_4_0_0()
        } else {
            items = await _getMemberList_5_0_0()
        }

        setMembers((state) => ({
            ...state,
            items: items.sort((a, b) => (a.user.name > b.user.name ? 1 : -1)),
            filtered: items.map((item) => item.profile),
            isFetching: false,
        }))
    }, [dao])

    const _getMemberList_1_0_0 = async (): Promise<TDaoMemberDetails[]> => {
        const gosh = dao.getGosh()
        const smv = await dao.getSmv()
        const details = await dao.getDetails()
        const items = await executeByChunk(
            details.members,
            MAX_PARALLEL_READ,
            async (member) => {
                const profile = await gosh.getProfile({ address: member.profile })
                const name = await profile.getName()
                const wallet = await dao.getMemberWallet({ address: member.wallet })
                const balance = await smv.getWalletBalance(wallet)
                return { ...member, allowance: balance, user: { name, type: 'user' } }
            },
        )
        return items
    }

    const _getMemberList_2_0_0 = async () => {
        const gosh = dao.getGosh()
        const smv = await dao.getSmv()
        const prevDao = await dao.getPrevDao()

        const members = await dao.getMembers()
        const items = await executeByChunk(members, MAX_PARALLEL_READ, async (member) => {
            const user = await gosh.getUserByAddress(member.profile)

            const wallet = await dao.getMemberWallet({ address: member.wallet })
            const { smvAvailable, smvLocked, smvBalance } = await smv.getDetails(wallet)
            const balance = Math.max(smvAvailable, smvLocked) + smvBalance

            let balancePrev = 0
            if (prevDao && prevDao.getVersion() !== '1.0.0') {
                const wallet = await prevDao.getMemberWallet({ profile: member.profile })
                if (await wallet.isDeployed()) {
                    const { smvAvailable, smvLocked, smvBalance } = await smv.getDetails(
                        wallet,
                    )
                    balancePrev = Math.max(smvAvailable, smvLocked) + smvBalance
                }
            }

            return { ...member, user, balance, balancePrev }
        })
        return items
    }

    const _getMemberList_4_0_0 = async () => {
        const gosh = dao.getGosh()
        const details = await dao.dao.runLocal('getDetails', {})
        const smv = await dao.getSmv()
        const prevDao = await dao.getPrevDao()
        const prevGosh = prevDao?.getGosh()

        const members = await dao.getMembers()
        const items = await executeByChunk(members, MAX_PARALLEL_READ, async (member) => {
            // Resolve user (it can be DAO member which is not upgraded)
            const profileHex = `0x${member.profile.slice(2)}`
            const isDaoAsMember = details.daoMembers[profileHex]
            const user = isDaoAsMember
                ? { name: isDaoAsMember, type: 'dao' }
                : await gosh.getUserByAddress(member.profile)

            // Get wallet balance in current DAO version
            const wallet = await dao.getMemberWallet({ address: member.wallet })
            const { smvAvailable, smvLocked, smvBalance } = await smv.getDetails(wallet)
            const balance = Math.max(smvAvailable, smvLocked) + smvBalance

            // Get balance in prev DAO version
            let balancePrev = 0
            if (prevDao && prevDao.getVersion() !== '1.0.0') {
                // Resolve member prev profile address (const for user, dynamic for dao)
                let memberProfile = member.profile
                if (user.type === 'dao') {
                    const daoAsMember = await prevGosh!.getDao({
                        name: user.name,
                        useAuth: false,
                    })
                    memberProfile = daoAsMember.getAddress()
                }

                // Get wallet balance for prev DAO version
                const wallet = await prevDao.getMemberWallet({ profile: memberProfile })
                if (await wallet.isDeployed()) {
                    const { smvAvailable, smvLocked, smvBalance } = await smv.getDetails(
                        wallet,
                    )
                    balancePrev = Math.max(smvAvailable, smvLocked) + smvBalance
                }
            }

            return { ...member, user, balance, balancePrev }
        })
        return items
    }

    const _getMemberList_5_0_0 = async () => {
        const gosh = dao.getGosh()
        const details = await dao.dao.runLocal('getDetails', {})
        const prevDao = await dao.getPrevDao()

        const members = await dao.getMembers()
        const items = await executeByChunk(members, MAX_PARALLEL_READ, async (member) => {
            // Resolve user (it can be DAO member which is not upgraded)
            const profileHex = `0x${member.profile.slice(2)}`
            const isDaoAsMember = details.daoMembers[profileHex]
            const user = isDaoAsMember
                ? { name: isDaoAsMember, type: 'dao' }
                : await gosh.getUserByAddress(member.profile)

            // Get wallet balance in current DAO version
            const wallet = await dao.getMemberWallet({ address: member.wallet })
            const { m_pseudoDAOBalance } = await wallet.runLocal('m_pseudoDAOBalance', {})
            const { _lockedBalance } = await wallet.runLocal('_lockedBalance', {})
            const balance = parseInt(m_pseudoDAOBalance) + parseInt(_lockedBalance)

            // If member has karma but has no token balance, it means that
            // member might not transferred tokens from previous DAO versions
            let balancePrev = 0
            if (prevDao && prevDao.getVersion() !== '1.0.0') {
                balancePrev = (member.allowance ?? 0) > balance ? 1 : 0
            }

            return { ...member, user, balance, balancePrev }
        })
        return items
    }

    /** Get initial DAO members list */
    useEffect(() => {
        _getMemberList()
    }, [_getMemberList])

    /** Update filtered items and page depending on search */
    useEffect(() => {
        setMembers((state) => {
            return {
                ...state,
                page: search ? 1 : state.page,
                filtered: state.items
                    .filter((item) => {
                        const pattern = new RegExp(search, 'i')
                        return (
                            !search ||
                            !item.user.name ||
                            item.user.name.search(pattern) >= 0
                        )
                    })
                    .map((item) => item.profile),
            }
        })
    }, [search])

    /**
     * Refresh members list
     * TODO: Disable for now (member list is editable)
     * Need a mechanism to prevent updated if member list item changed
     */
    // useEffect(() => {
    //     let _intervalLock = false
    //     const interval = setInterval(async () => {
    //         if (!_intervalLock) {
    //             _intervalLock = true
    //             await _getMemberList()
    //             _intervalLock = false
    //         }
    //     }, 30000)

    //     return () => {
    //         clearInterval(interval)
    //     }
    // }, [members.isFetching, _getMemberList])

    return {
        isFetching: members.isFetching,
        items: members.items
            .filter((item) => members.filtered.indexOf(item.profile) >= 0)
            .slice(0, perPage ? members.page * perPage : members.items.length),
        hasNext: perPage ? members.page * perPage < members.filtered.length : false,
        search,
        setSearch,
        getMore,
    }
}

function useDaoMemberCreate(dao: IGoshDaoAdapter) {
    const version = dao.getVersion()

    const _create_1_0_0 = async (options: { usernames?: string[] }) => {
        const clean = (options.usernames || []).filter((item) => !!item)
        if (clean.length) {
            await dao.createMember({ usernames: clean })
        }
    }

    const _create_2_0_0 = async (options: {
        members?: TDaoMemberCreateParams['members']
    }) => {
        const clean = (options.members || []).filter(({ user }) => !!user.name)
        if (!clean.length) {
            return
        }

        const memberAddCells: { type: number; params: TDaoMemberCreateParams }[] =
            clean.map(({ user, comment, expired }) => ({
                type: ESmvEventType.DAO_MEMBER_ADD,
                params: {
                    members: [{ user, allowance: 0, comment, expired }],
                },
            }))

        // Stupid, but needed.
        // If there is only one member add cell, we need to add extra
        // cells for multiproposal for delay.
        // If not, voting tokens won't be added to the user
        const extraCells: { type: number; params: TDaoMintTokenParams }[] = []
        if (memberAddCells.length === 1) {
            extraCells.push({
                type: ESmvEventType.DAO_TOKEN_MINT,
                params: { amount: 0 },
            })
        }

        const memberAddVotingCells: {
            type: number
            params: TDaoVotingTokenAddParams
        }[] = clean.map(({ user, allowance }) => ({
            type: ESmvEventType.DAO_TOKEN_VOTING_ADD,
            params: { user, amount: allowance },
        }))
        await dao.createMultiProposal({
            proposals: [...memberAddCells, ...extraCells, ...memberAddVotingCells],
        })
    }

    const _create_3_0_0 = async (options: {
        members?: TDaoMemberCreateParams['members']
    }) => {
        const clean = (options.members || []).filter(({ user }) => !!user.name)
        if (!clean.length) {
            return
        }

        const memberAddCells: { type: number; params: TDaoMemberCreateParams }[] =
            clean.map(({ user, comment, expired }) => ({
                type: ESmvEventType.DAO_MEMBER_ADD,
                params: {
                    members: [{ user, allowance: 0, comment, expired }],
                },
            }))
        const memberAddVotingCells: { type: number; params: TDaoVotingTokenAddParams }[] =
            clean.map(({ user, allowance }) => ({
                type: ESmvEventType.DAO_TOKEN_VOTING_ADD,
                params: { user, amount: allowance },
            }))
        await dao.createMultiProposal({
            proposals: [...memberAddCells, ...memberAddVotingCells],
        })
    }

    if (version === '1.0.0') {
        return _create_1_0_0
    } else if (version === '2.0.0') {
        return _create_2_0_0
    }
    return _create_3_0_0
}

function useDaoMemberDelete(dao: IGoshDaoAdapter) {
    const [fetching, setFetching] = useState<string[]>([])
    const version = dao.getVersion()

    const isFetching = (username: string) => fetching.indexOf(username) >= 0

    const _remove_1_0_0 = async (
        users: { user: TUserParam; allowance: number; profile: string }[],
    ) => {
        const nameList = users.map(({ user }) => user.name)

        setFetching((state) => [...state, ...nameList])
        await dao.deleteMember({ user: users.map(({ user }) => user) })
        setFetching((state) => state.filter((item) => nameList.indexOf(item) < 0))
    }

    const _remove_2_0_0 = async (
        users: { user: TUserParam; allowance: number; profile: string }[],
    ) => {
        const nameList = users.map(({ user }) => user.name)

        setFetching((state) => [...state, ...nameList])

        const memberUpdateAllowanceCells: {
            type: number
            params: TDaoMemberAllowanceUpdateParams
        }[] = users.map((item) => ({
            type: ESmvEventType.DAO_ALLOWANCE_CHANGE,
            params: {
                members: [
                    { profile: item.profile, increase: false, amount: item.allowance },
                ],
            },
        }))

        const memberRemoveCells: { type: number; params: TDaoMemberDeleteParams }[] =
            users.map((item) => ({
                type: ESmvEventType.DAO_MEMBER_DELETE,
                params: { user: [item.user] },
            }))

        await dao.createMultiProposal({
            proposals: [...memberUpdateAllowanceCells, ...memberRemoveCells],
        })

        setFetching((state) => state.filter((item) => nameList.indexOf(item) < 0))
    }

    const remove = async (
        users: { user: TUserParam; allowance: number; profile: string }[],
    ) => {
        if (version === '1.0.0') {
            return await _remove_1_0_0(users)
        }
        return await _remove_2_0_0(users)
    }

    return { remove, isFetching }
}

function useDaoMint(dao: IGoshDaoAdapter) {
    const mint = async (amount: number, comment?: string) => {
        if (amount > 0) {
            await dao.mint({ amount, comment })
        }
    }

    return mint
}

function useDaoMemberUpdate(dao: IGoshDaoAdapter) {
    const update = async (
        updated: (TDaoMemberDetails & { _allowance?: number; _balance?: number })[],
        comment?: string,
    ) => {
        const { supply } = await dao.getDetails()

        // Prepare balance change cells
        const balanceCells = updated
            .filter(({ balance, _balance }) => {
                let isValid = _filter(balance, _balance)
                if (isValid) {
                    isValid = balance! > _balance!
                }
                return isValid
            })
            .map(({ user, balance = 0, _balance = 0 }) => ({
                type: ESmvEventType.DAO_TOKEN_REGULAR_ADD,
                params: {
                    user,
                    amount: Math.abs(balance - _balance),
                },
            }))

        // Validate balance change against DAO reserve
        const balanceIncrease = balanceCells.reduce((_sum: number, { params }) => {
            return _sum + params.amount
        }, 0)
        if (balanceIncrease > supply.reserve) {
            throw new GoshError('Reserve is not enough', {
                increase: balanceIncrease,
                reserve: supply.reserve,
                message: 'DAO reserve is not enough',
            })
        }

        // Prepare allowance change cells
        const allowanceCells = updated
            .filter(({ allowance, _allowance }) => {
                return _filter(allowance, _allowance)
            })
            .map(({ profile, allowance = 0, _allowance = 0 }) => ({
                type: ESmvEventType.DAO_ALLOWANCE_CHANGE,
                params: {
                    members: [
                        {
                            profile,
                            increase: allowance > _allowance,
                            amount: Math.abs(allowance - _allowance),
                        },
                    ],
                },
            }))

        // Validate total allowance against DAO supply
        const allowanceTotal = updated.reduce((_sum: number, { allowance }) => {
            return _sum + (allowance || 0)
        }, 0)
        if (allowanceTotal > supply.total) {
            throw new GoshError('Karma is too large', {
                karma: allowanceTotal,
                supply: supply.total,
                message: 'Total members karma can not be greater than DAO total supply',
            })
        }

        // Result cells
        const resultCells: { type: number; params: object }[] = [
            ...balanceCells,
            ...allowanceCells,
        ]
        if (resultCells.length === 0) {
            throw new GoshError('Nothing was changed')
        } else if (resultCells.length === 1) {
            resultCells.push({ type: ESmvEventType.DELAY, params: {} })
        }

        // Create multiproposal
        await dao.createMultiProposal({
            proposals: resultCells,
            comment,
        })
    }

    const _filter = (a: number | undefined, b: number | undefined) => {
        if (a === undefined || b === undefined) {
            return false
        }
        if (!Number.isInteger(a) || !Number.isInteger(b)) {
            return false
        }
        if (a < 0 || b < 0) {
            return false
        }
        if (a === b) {
            return false
        }
        return true
    }

    return update
}

function useDaoSettingsManage(dao: IGoshDaoAdapter) {
    const updateEventShowProgress = async (params: {
        decision: boolean
        comment?: string
    }) => {
        await dao.updateEventShowProgress(params)
    }

    const updateEventAllowDiscussion = async (params: {
        allow: boolean
        comment?: string
    }) => {
        await dao.updateEventAllowDiscussion(params)
    }

    const disableMint = async (comment?: string) => {
        await dao.disableMint({ comment })
    }

    const updateAskMembershipAllowance = async (decision: boolean, comment?: string) => {
        await dao.updateAskMembershipAllowance({ decision, comment })
    }

    return {
        disableMint,
        updateEventShowProgress,
        updateEventAllowDiscussion,
        updateAskMembershipAllowance,
    }
}

function useTaskList(
    dao: IGoshDaoAdapter,
    params: { repository?: string; perPage?: number },
) {
    const [accounts, setAccounts] = useState<{
        isFetching: boolean
        items: { id: TAddress; last_paid: number }[]
    }>({ isFetching: false, items: [] })
    const [tasks, setTasks] = useState<{
        isFetching: boolean
        items: TTaskListItem[]
        lastAccountIndex: number
        hasNext?: boolean
    }>({ items: [], isFetching: false, lastAccountIndex: 0 })

    const { repository, perPage = 5 } = params

    const getTaskAccounts = useCallback(async () => {
        setAccounts((state) => ({ ...state, isFetching: true }))

        let result: { id: TAddress; last_paid: number }[] = []
        if (!repository) {
            result = await _getTaskAccountsDao(dao)
        } else {
            result = await _getTaskAccountsRepository(dao, repository)
        }

        setAccounts((state) => ({
            ...state,
            isFetching: false,
            items: result.sort((a, b) => b.last_paid - a.last_paid),
        }))
    }, [dao, repository])

    const _getTaskAccountsDao = async (
        dao: IGoshDaoAdapter,
    ): Promise<{ id: TAddress; last_paid: number }[]> => {
        const gosh = dao.getGosh()
        const codeHash = await gosh.getTaskTagDaoCodeHash(dao.getAddress(), SYSTEM_TAG)
        const result = await getAllAccounts({
            filters: [`code_hash: {eq:"${codeHash}"}`],
            result: ['last_paid'],
        })
        return await executeByChunk(
            result,
            MAX_PARALLEL_READ,
            async ({ id, last_paid }) => {
                const tag = await gosh.getHelperTag(id)
                const { _task } = await tag.runLocal('_task', {})
                return { id: _task, last_paid }
            },
        )
    }

    const _getTaskAccountsRepository = async (
        dao: IGoshDaoAdapter,
        repository: string,
    ): Promise<{ id: TAddress; last_paid: number }[]> => {
        const codeHash = await dao.getTaskCodeHash(repository)
        return await getAllAccounts({
            filters: [`code_hash: {eq:"${codeHash}"}`],
            result: ['last_paid'],
        })
    }

    const getTaskList = useCallback(
        async (lastAccountIndex: number) => {
            if (accounts.isFetching) {
                return
            }
            setTasks((state) => ({ ...state, isFetching: true }))
            const endAccountIndex = perPage > 0 ? lastAccountIndex + perPage : undefined
            const items: TTaskListItem[] = await executeByChunk(
                accounts.items.slice(lastAccountIndex, endAccountIndex),
                MAX_PARALLEL_READ,
                async ({ id }) => {
                    const data = await dao.getTask({ address: id })
                    return { adapter: dao, ...data }
                },
            )
            setTasks((state) => ({
                ...state,
                isFetching: false,
                items: [...state.items, ...items],
                lastAccountIndex: endAccountIndex || accounts.items.length,
                hasNext: endAccountIndex
                    ? endAccountIndex < accounts.items.length
                    : false,
            }))
        },
        [dao, accounts.isFetching, accounts.items, perPage],
    )

    const getMore = async () => {
        await getTaskList(tasks.lastAccountIndex)
    }

    const getItemDetails = async (item: TTaskListItem) => {
        if (item.isLoadDetailsFired) {
            return
        }
        setTasks((state) => ({
            ...state,
            items: state.items.map((curr) => {
                if (curr.address === item.address) {
                    return { ...curr, isLoadDetailsFired: true }
                }
                return curr
            }),
        }))
        try {
            const details = await item.adapter.getTask({ address: item.address })
            setTasks((state) => ({
                ...state,
                items: state.items.map((curr) => {
                    if (curr.address === item.address) {
                        return { ...curr, ...details }
                    }
                    return curr
                }),
            }))
        } catch {
            setTasks((state) => ({
                ...state,
                items: state.items.filter((curr) => curr.address !== item.address),
            }))
        }
    }

    /** Get all task accounts */
    useEffect(() => {
        getTaskAccounts()
    }, [getTaskAccounts])

    /** Initial loading */
    useEffect(() => {
        getTaskList(0)
    }, [getTaskList])

    /** Refresh task last (reset `isLoadDetailsFired` flag) */
    useEffect(() => {
        const interval = setInterval(() => {
            if (accounts.isFetching || tasks.isFetching) {
                return
            }

            setTasks((state) => ({
                ...state,
                items: state.items.map((item) => ({
                    ...item,
                    isLoadDetailsFired: false,
                })),
            }))
        }, 20000)

        return () => {
            clearInterval(interval)
        }
    }, [accounts.isFetching, tasks.isFetching])

    return {
        isFetching: accounts.isFetching || tasks.isFetching,
        isEmpty: !accounts.isFetching && !tasks.isFetching && !tasks.items.length,
        items: tasks.items,
        hasNext: tasks.hasNext,
        getMore,
        getItemDetails,
    }
}

function useTask(dao: IGoshDaoAdapter, address: TAddress) {
    const [task, setTask] = useState<{ isFetching: boolean; details?: TTaskDetails }>({
        isFetching: false,
    })

    const getTask = useCallback(async () => {
        setTask((state) => ({ ...state, isFetching: true }))
        const details = await dao.getTask({ address })
        setTask((state) => ({ ...state, details, isFetching: false }))
    }, [dao, address])

    /** Initial load */
    useEffect(() => {
        getTask()
    }, [getTask])

    /** Refresh task details */
    useEffect(() => {
        if (task.isFetching || task.details?.confirmed) {
            return
        }

        let _intervalLock = false
        const interval = setInterval(async () => {
            if (!_intervalLock) {
                _intervalLock = true
                await getTask()
                _intervalLock = false
            }

            if (task.details?.confirmed) {
                clearInterval(interval)
            }
        }, 20000)

        return () => {
            clearInterval(interval)
        }
    }, [task.isFetching, task.details?.confirmed, getTask])

    return task
}

function useTopicCreate(dao: IGoshDaoAdapter) {
    const create = async (params: TTopicCreateParams) => {
        await dao.createTopic(params)
    }

    return create
}

function useTopicList(dao: IGoshDaoAdapter, params: { perPage?: number }) {
    const [accounts, setAccounts] = useState<{
        isFetching: boolean
        items: { id: TAddress; last_paid: number }[]
    }>({ isFetching: false, items: [] })
    const [topics, setTopics] = useState<{
        isFetching: boolean
        items: TTopic[]
        lastAccountIndex: number
        hasNext?: boolean
    }>({ items: [], isFetching: false, lastAccountIndex: 0 })

    const { perPage = 5 } = params

    const getAccounts = useCallback(async () => {
        setAccounts((state) => ({ ...state, isFetching: true }))

        const codeHash = await dao.getTopicCodeHash()
        const result = await getAllAccounts({
            filters: [`code_hash: {eq:"${codeHash}"}`],
            result: ['last_paid'],
        })

        setAccounts((state) => ({
            ...state,
            isFetching: false,
            items: result.sort((a, b) => b.last_paid - a.last_paid),
        }))
    }, [dao])

    const getTopicList = useCallback(
        async (lastAccountIndex: number) => {
            if (accounts.isFetching) {
                return
            }
            setTopics((state) => ({ ...state, isFetching: true }))
            const endAccountIndex = lastAccountIndex + perPage
            const items: TTopic[] = await executeByChunk(
                accounts.items.slice(lastAccountIndex, endAccountIndex),
                MAX_PARALLEL_READ,
                async ({ id }) => {
                    return await dao.getTopic({ address: id })
                },
            )
            setTopics((state) => ({
                ...state,
                isFetching: false,
                items: [...state.items, ...items],
                lastAccountIndex: endAccountIndex,
                hasNext: endAccountIndex < accounts.items.length,
            }))
        },
        [accounts.isFetching, accounts.items, perPage],
    )

    const getMore = async () => {
        await getTopicList(topics.lastAccountIndex)
    }

    /** Get all topic accounts */
    useEffect(() => {
        getAccounts()
    }, [getAccounts])

    /** Initial loading */
    useEffect(() => {
        getTopicList(0)
    }, [getTopicList])

    return {
        isFetching: accounts.isFetching || topics.isFetching,
        isEmpty: !accounts.isFetching && !topics.isFetching && !topics.items.length,
        items: topics.items,
        hasNext: topics.hasNext,
        getMore,
    }
}

function useTopic(dao: IGoshDaoAdapter, topic: TAddress, options: { perPage?: number }) {
    const [data, setData] = useState<{
        isFetching: boolean
        topic?: TTopic
    }>({ isFetching: false })
    const [messages, setMessages] = useState<{
        isFetching: boolean
        items: any[]
        cursor?: string
        hasNext?: boolean
    }>({
        isFetching: false,
        items: [],
    })

    const { perPage = 5 } = options

    const sendMessage = async (params: { message: string; answerId?: string }) => {
        const { message, answerId } = params
        await dao.createTopicMessage({ topic, message, answerId })
    }

    const getMessages = useCallback(
        async (from?: string) => {
            if (!data.topic) {
                return
            }

            setMessages((state) => ({ ...state, isFetching: true }))

            const { messages, cursor, hasNext } = await data.topic.account.getMessages(
                {
                    msgType: ['IntIn'],
                    allow_latest_inconsistent_data: true,
                    limit: perPage,
                    cursor: from,
                },
                true,
                false,
            )

            setMessages((state) => ({
                isFetching: false,
                items: [
                    ...state.items,
                    ...messages
                        .filter(
                            ({ decoded }) => decoded && decoded.name === 'acceptMessage',
                        )
                        .map(({ message, decoded }) => ({
                            id: message.id.replace('message/', ''),
                            ...decoded.value,
                        })),
                ],
                cursor,
                hasNext,
            }))
        },
        [data.topic, perPage],
    )

    const getMore = async () => {
        await getMessages(messages.cursor)
    }

    useEffect(() => {
        const _getTopic = async () => {
            setData((state) => ({ ...state, isFetching: true }))
            const _topic = await dao.getTopic({ address: topic })
            setData((state) => ({ ...state, isFetching: false, topic: _topic }))
        }
        _getTopic()
    }, [dao, topic])

    useEffect(() => {
        getMessages()

        // Subscribe messages
        if (data.topic) {
            data.topic.account.account.subscribeMessages('id body', async (message) => {
                console.debug('Subscription', message)
                const decoded = await data.topic?.account.decodeMessageBody(
                    message.body,
                    0,
                )
                if (decoded) {
                    setMessages((state) => ({
                        ...state,
                        items: [{ id: message.id, ...decoded.value }, ...state.items],
                    }))
                }
            })
        }

        return () => {
            data.topic?.account.account.free()
        }
    }, [data.topic, getMessages])

    return {
        data,
        messages,
        getMoreMessages: getMore,
        sendMessage,
    }
}

export {
    useDaoList,
    useDao,
    useDaoCreate,
    useDaoUpgrade,
    useDaoAutoTokenTransfer,
    useDaoMemberList,
    useDaoMemberCreate,
    useDaoMemberDelete,
    useDaoMemberUpdate,
    useDaoMint,
    useDaoSettingsManage,
    useTaskList,
    useTask,
    useTopicCreate,
    useTopicList,
    useTopic,
    useVestingBalance,
}

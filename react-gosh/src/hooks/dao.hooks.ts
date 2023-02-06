import { useCallback, useEffect, useState } from 'react'
import { useRecoilState } from 'recoil'
import { executeByChunk } from '../helpers'
import { daoAtom } from '../store'
import { TDaoCreateProgress, TDaoListItem, TDaoMemberDetails } from '../types'
import { EGoshError, GoshError } from '../errors'
import { AppConfig } from '../appconfig'
import { useProfile, useUser } from './user.hooks'
import { IGoshDaoAdapter, IGoshRepositoryAdapter } from '../gosh/interfaces'
import { GoshAdapterFactory } from '../gosh'
import { MAX_PARALLEL_READ } from '../constants'

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

                if (index < 0) clean.push(item)
                else if (clean[index].version < version) clean[index] = item
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

    useEffect(() => {
        const interval = setInterval(updateDetails, 10000)
        return () => {
            clearInterval(interval)
        }
    }, [updateDetails])

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
        let isDaoDeployed: boolean
        try {
            if (!profile) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

            const usernames = (options.members || []).filter((item) => !!item)
            const profiles = await gosh.isValidProfile(usernames)
            const addresses = profiles.map(({ address }) => address)
            await profile.deployDao(gosh, name, [profile.address, ...addresses])
            isDaoDeployed = true
        } catch (e) {
            isDaoDeployed = false
            throw e
        } finally {
            setProgress((state) => ({ ...state, isDaoDeployed }))
        }

        // Set progress
        setProgress((state) => ({ ...state, isFetching: false }))
    }

    const _create_1_1_0 = async (
        name: string,
        options: {
            tags?: string[]
            description?: string
            supply?: number
            mint?: boolean
        },
    ) => {
        if (!profile || !user.keys || !user.username) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }

        const { tags, description, supply, mint } = options

        // Set initial progress
        setProgress({ isFetching: true })

        // Deploy DAO
        let dao: IGoshDaoAdapter
        try {
            dao = await profile.deployDao(gosh, name, [profile.address])
            setProgress((state) => ({ ...state, isDaoDeployed: true }))
        } catch (e) {
            setProgress((state) => ({ ...state, isDaoDeployed: false }))
            throw e
        }

        // Authorize DAO
        try {
            await dao.setAuth(user.username, user.keys)
            setProgress((state) => ({ ...state, isDaoAuthorized: true }))
        } catch (e) {
            setProgress((state) => ({ ...state, isDaoAuthorized: false }))
            throw e
        }

        // Setup total supply and minting policy
        try {
            if (supply && supply > 20) {
                await dao.mint(supply - 20, { alone: true })
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
                await dao.createTag(cleanTags, true)
            }
            setProgress((state) => ({ ...state, isTagsDeployed: true }))
        } catch {
            setProgress((state) => ({ ...state, isTagsDeployed: false }))
        }

        // Deploy DAO service repository
        let repo: IGoshRepositoryAdapter
        try {
            repo = await dao.createRepository('_index', { alone: true })
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

        // Set progress
        setProgress((state) => ({ ...state, isFetching: false }))
    }

    // Resolve create fn
    let createFn = null
    if (version === '1.0.0') {
        createFn = _create_1_0_0
    } else if (version === '1.1.0') {
        createFn = _create_1_1_0
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

    const upgrade = async (version: string) => {
        if (Object.keys(AppConfig.versions).indexOf(version) < 0) {
            throw new GoshError(`Gosh version ${version} is not supported`)
        }
        await dao.upgrade(version)
    }

    return { versions, upgrade }
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
        } else if (version === '1.1.0') {
            items = await _getMemberList_1_1_0()
        }

        setMembers((state) => ({
            ...state,
            items: items.sort((a, b) => (a.name > b.name ? 1 : -1)),
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
                return { ...member, name, allowance: balance }
            },
        )
        return items
    }

    const _getMemberList_1_1_0 = async () => {
        const gosh = dao.getGosh()

        const details = await dao.getDetails()
        const items = await executeByChunk(
            details.members,
            MAX_PARALLEL_READ,
            async (member) => {
                const profile = await gosh.getProfile({ address: member.profile })
                const name = await profile.getName()
                return { ...member, name }
            },
        )
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
                        return !search || !item.name || item.name.search(pattern) >= 0
                    })
                    .map((item) => item.profile),
            }
        })
    }, [search])

    /** Refresh members list */
    useEffect(() => {
        const interval = setInterval(_getMemberList, 30000)

        return () => {
            clearInterval(interval)
        }
    }, [members.isFetching, _getMemberList])

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
            await dao.createMember(clean)
        }
    }

    const _create_1_1_0 = async (options: {
        members?: { username: string; allowance: number; comment: string }[]
    }) => {
        const clean = (options.members || []).filter(({ username }) => !!username)
        if (clean.length) {
            await dao.createMember(clean)
        }
    }

    if (version === '1.0.0') {
        return _create_1_0_0
    }
    if (version === '1.1.0') {
        return _create_1_1_0
    }
    return null
}

function useDaoMemberDelete(dao: IGoshDaoAdapter) {
    const [fetching, setFetching] = useState<string[]>([])

    const isFetching = (username: string) => fetching.indexOf(username) >= 0

    const remove = async (username: string[]) => {
        setFetching((state) => [...state, ...username])
        await dao.deleteMember(username)
        setFetching((state) => state.filter((item) => username.indexOf(item) < 0))
    }

    return { remove, isFetching }
}

function useDaoMint(dao: IGoshDaoAdapter) {
    const mint = async (amount: number, comment?: string) => {
        if (amount > 0) {
            await dao.mint(amount, { comment })
        }
    }

    return mint
}

function useDaoMintDisable(dao: IGoshDaoAdapter) {
    const disable = async (comment?: string) => {
        await dao.disableMint({ comment })
    }

    return disable
}

function useDaoMemberSetAllowance(dao: IGoshDaoAdapter) {
    const update = async (
        updated: (TDaoMemberDetails & { _allowance?: number })[],
        comment?: string,
    ) => {
        const prepared = updated
            .filter(({ allowance, _allowance }) => {
                if (allowance === undefined || _allowance === undefined) {
                    return false
                }
                if (!Number.isInteger(allowance) || !Number.isInteger(_allowance)) {
                    return false
                }
                if (allowance < 0 || _allowance < 0) {
                    return false
                }
                if (allowance === _allowance) {
                    return false
                }
                return true
            })
            .map(({ profile, allowance = 0, _allowance = 0 }) => ({
                profile,
                increase: allowance > _allowance,
                amount: Math.abs(allowance - _allowance),
            }))
        await dao.updateMemberAllowance(prepared, { comment })
    }

    return update
}

export {
    useDaoList,
    useDao,
    useDaoCreate,
    useDaoUpgrade,
    useDaoMemberList,
    useDaoMemberCreate,
    useDaoMemberDelete,
    useDaoMemberSetAllowance,
    useDaoMint,
    useDaoMintDisable,
}

import { useEffect, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import { retry } from '../helpers'
import { userAtom, daoAtom, walletAtom } from '../store'
import { TDaoCreateProgress, TDaoListItem, TDaoMemberListItem } from '../types'
import { EGoshError, GoshError } from '../errors'
import { AppConfig } from '../appconfig'
import { useProfile } from './user.hooks'
import { IGoshDaoAdapter, IGoshWallet } from '../gosh/interfaces'
import { GoshAdapterFactory } from '../gosh'

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
            const daos = await profile.getDaos()
            const items = await Promise.all(
                daos.map(async (dao) => {
                    return {
                        adapter: dao,
                        address: dao.getAddress(),
                        name: await dao.getName(),
                        version: dao.getVersion(),
                    }
                }),
            )
            setDaos((state) => {
                const merged = [...state.items, ...items]
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

    useEffect(() => {
        const _getDao = async () => {
            let instance: IGoshDaoAdapter | undefined
            for (const version of Object.keys(AppConfig.versions).reverse()) {
                const gosh = GoshAdapterFactory.create(version)
                console.debug('Gosh', version)
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

    return {
        adapter,
        details,
        errors,
        isFetching,
    }
}

function useDaoCreate() {
    const profile = useProfile()
    const [progress, setProgress] = useState<TDaoCreateProgress>({
        isFetching: false,
    })

    const create = async (name: string) => {
        if (!profile) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        // Set initial progress
        setProgress((state) => ({
            ...state,
            isFetching: true,
        }))

        // Deploy dao
        let isDaoDeployed: boolean
        try {
            const gosh = GoshAdapterFactory.createLatest()
            await retry(async () => {
                await profile.deployDao(gosh, name, [profile.address])
            }, 3)
            isDaoDeployed = true
        } catch (e) {
            isDaoDeployed = false
            throw e
        } finally {
            setProgress((state) => ({
                ...state,
                isDaoDeployed,
            }))
        }
    }

    return { progress, create }
}

function useDaoUpgrade(dao: IGoshDaoAdapter) {
    const profile = useProfile()
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
        if (!profile) throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        if (Object.keys(AppConfig.versions).indexOf(version) < 0) {
            throw new GoshError(`Gosh version ${version} is not supported`)
        }

        const gosh = GoshAdapterFactory.create(version)

        const profileGoshAddress = await profile.getGoshAddress()
        if (profileGoshAddress !== gosh.gosh.address) {
            await retry(async () => await profile.setGoshAddress(gosh.gosh.address), 3)
        }

        await retry(async () => {
            await profile.deployDao(gosh, await dao.getName(), [], dao.getAddress())
        }, 3)
    }

    return { versions, upgrade }
}

function useDaoMemberList(dao: IGoshDaoAdapter, perPage: number) {
    const [search, setSearch] = useState<string>('')
    const [members, setMembers] = useState<{
        items: TDaoMemberListItem[]
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

    /** Load item details and update corresponging list item */
    const setItemDetails = async (item: TDaoMemberListItem) => {
        if (item.isLoadDetailsFired) return

        setMembers((state) => ({
            ...state,
            items: state.items.map((curr) => {
                if (curr.profile === item.profile) {
                    return { ...curr, isLoadDetailsFired: true }
                }
                return curr
            }),
        }))

        const wallet = await dao.getMemberWallet({ address: item.wallet })
        const details = {
            smvBalance: await wallet.getSmvTokenBalance(),
        }

        setMembers((state) => ({
            ...state,
            items: state.items.map((curr) => {
                if (curr.profile === item.profile) return { ...curr, ...details }
                return curr
            }),
        }))
    }

    /** Get initial DAO members list */
    useEffect(() => {
        const _getMemberList = async () => {
            const gosh = GoshAdapterFactory.createLatest()
            const details = await dao.getDetails()
            const items = await Promise.all(
                details.members.map(async (member) => {
                    const profile = await gosh.getProfile({ address: member.profile })
                    const name = await profile.getName()
                    return { ...member, name }
                }),
            )
            setMembers((state) => ({
                ...state,
                items: items.sort((a, b) => (a.name > b.name ? 1 : -1)),
                filtered: items.map((item) => item.profile),
                isFetching: false,
            }))
        }

        _getMemberList()
    }, [dao.getAddress()])

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

    /** Refresh members details (reset `isLoadDetailsFired` flag) */
    useEffect(() => {
        const interval = setInterval(() => {
            if (members.isFetching) return

            setMembers((state) => ({
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
    }, [members.isFetching])

    return {
        isFetching: members.isFetching,
        items: members.items
            .filter((item) => members.filtered.indexOf(item.profile) >= 0)
            .slice(0, perPage ? members.page * perPage : members.items.length),
        hasNext: perPage ? members.page * perPage < members.filtered.length : false,
        search,
        setSearch,
        getMore,
        getItemDetails: setItemDetails,
    }
}

function useDaoMemberCreate(dao: IGoshDaoAdapter) {
    const create = async (username: string[]) => {
        await retry(async () => await dao.createMember(username), 3)
    }
    return create
}

function useDaoMemberDelete(dao: IGoshDaoAdapter) {
    const [fetching, setFetching] = useState<string[]>([])

    const isFetching = (username: string) => fetching.indexOf(username) >= 0

    const remove = async (username: string[]) => {
        setFetching((state) => [...state, ...username])
        await retry(async () => await dao.deleteMember(username), 3)
        setFetching((state) => state.filter((item) => username.indexOf(item) < 0))
    }

    return { remove, isFetching }
}

function useWallet(dao?: IGoshDaoAdapter, isFetching?: boolean) {
    const [details, setDetails] = useRecoilState(walletAtom)
    const [wallet, setWallet] = useState<IGoshWallet>()
    const user = useRecoilValue(userAtom)

    useEffect(() => {
        const _getWallet = async () => {
            if (!user.profile || !user.keys || !dao || isFetching) return
            if (!details?.address || details?.daoAddress !== dao.getAddress()) {
                console.debug('Get wallet hook (blockchain)')

                const instance = await dao._getWallet(0, user.keys)
                setWallet(instance)
                setDetails({
                    address: instance.address,
                    version: instance.version,
                    keys: user.keys,
                    daoAddress: dao.getAddress(),
                    isDaoOwner: user.profile === (await dao._getOwner()),
                    isDaoMember: await dao._isAuthMember(),
                })
            } else {
                console.debug('Get wallet hook (state)')
                const instance = await dao._getWallet(0, user.keys)
                setWallet(instance)
            }
        }

        _getWallet()
    }, [
        dao,
        user.username,
        user.keys,
        isFetching,
        details?.address,
        details?.daoAddress,
        setDetails,
    ])

    return { instance: wallet, details }
}

export {
    useDaoList,
    useDao,
    useDaoCreate,
    useDaoUpgrade,
    useDaoMemberList,
    useDaoMemberCreate,
    useDaoMemberDelete,
    useWallet,
}

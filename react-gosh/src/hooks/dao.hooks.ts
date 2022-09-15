import { useEffect, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import { getPaginatedAccounts, goshClient, goshRoot, retry } from '../helpers'
import { userStateAtom, daoAtom } from '../store'
import { GoshDao, GoshWallet } from '../classes'
import { sleep } from '../utils'
import {
    IGoshDao,
    IGoshWallet,
    TDaoCreateProgress,
    TDaoListItem,
    TDaoMemberCreateProgress,
    TDaoMemberListItem,
} from '../types'
import { EGoshError, GoshError } from '../errors'

function useDaoList(perPage: number) {
    const { keys } = useRecoilValue(userStateAtom)
    const [search, setSearch] = useState<string>('')
    const [daos, setDaos] = useState<{
        items: TDaoListItem[]
        filtered: string[]
        page: number
        isFetching: boolean
    }>({
        items: [],
        filtered: [],
        page: 1,
        isFetching: true,
    })

    /** Load next chunk of DAO list items */
    const onLoadNext = () => {
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

        const dao = new GoshDao(goshClient, item.address)
        const details = await dao.getDetails()

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
        const getDaoList = async () => {
            if (!keys?.public) return

            // Get GoshWallet code by user's pubkey and get all user's wallets
            const walletCode = await goshRoot.getDaoWalletCode(`0x${keys.public}`)
            const walletCodeHash = await goshClient.boc.get_boc_hash({
                boc: walletCode,
            })
            const wallets: string[] = []
            let next: string | undefined
            while (true) {
                const accounts = await getPaginatedAccounts({
                    filters: [`code_hash: {eq:"${walletCodeHash.hash}"}`],
                    limit: 50,
                    lastId: next,
                })
                wallets.push(...accounts.results.map(({ id }) => id))
                next = accounts.lastId

                if (accounts.completed) break
                sleep(200)
            }

            // Get unique dao addresses from wallets
            const uniqueDaoAddresses = new Set(
                await Promise.all(
                    wallets.map(async (address) => {
                        const wallet = new GoshWallet(goshClient, address)
                        return await wallet.getDaoAddr()
                    }),
                ),
            )

            // Get daos details from unique dao addressed
            const items = await Promise.all(
                Array.from(uniqueDaoAddresses).map(async (address) => {
                    const dao = new GoshDao(goshClient, address)
                    return { address, name: await dao.getName() }
                }),
            )

            setDaos({
                items: items.sort((a, b) => (a.name > b.name ? 1 : -1)),
                filtered: items.map((item) => item.address),
                page: 1,
                isFetching: false,
            })
        }

        getDaoList()
    }, [keys?.public])

    /** Update filtered items and page depending on search */
    useEffect(() => {
        setDaos((state) => {
            return {
                ...state,
                page: search ? 1 : state.page,
                filtered: state.items
                    .filter((item) => {
                        const pattern = new RegExp(search, 'i')
                        return !search || item.name.search(pattern) >= 0
                    })
                    .map((item) => item.address),
            }
        })
    }, [search])

    return {
        isFetching: daos.isFetching,
        isEmpty: !daos.isFetching && !daos.filtered.length,
        items: daos.items
            .filter((item) => daos.filtered.indexOf(item.address) >= 0)
            .slice(0, daos.page * perPage),
        hasNext: daos.page * perPage < daos.filtered.length,
        search,
        setSearch,
        loadNext: onLoadNext,
        loadItemDetails: setItemDetails,
    }
}

function useDao(name?: string) {
    const { keys } = useRecoilValue(userStateAtom)
    const [details, setDetails] = useRecoilState(daoAtom)
    const [dao, setDao] = useState<IGoshDao>()

    useEffect(() => {
        const getDao = async () => {
            if (!name) return

            if (!details?.address || details?.name !== name) {
                console.debug('Get dao hook (blockchain)')
                const address = await goshRoot.getDaoAddr(name)
                const dao = new GoshDao(goshClient, address)
                const details = await dao.getDetails()
                setDao(dao)
                setDetails(details)
            } else {
                console.debug('Get dao hook (from state)')
                setDao(new GoshDao(goshClient, details.address))
            }
        }

        getDao()
    }, [name, details?.name, details?.address, setDetails])

    return {
        instance: dao,
        details,
        isOwner: details && keys && details.ownerPubkey.slice(2) === keys.public,
    }
}

function useDaoCreate() {
    const { keys } = useRecoilValue(userStateAtom)
    const [progress, setProgress] = useState<TDaoCreateProgress>({
        isFetching: false,
        members: [],
    })

    const createDao = async (name: string, members: string[]) => {
        if (!keys) throw new GoshError(EGoshError.NO_USER)

        // Validate public keys
        members.unshift(`0x${keys.public}`)
        members = members
            .filter((pubkey) => !!pubkey)
            .map((pubkey) => {
                pubkey = pubkey.trim().toLowerCase()
                pubkey = pubkey.replace(/[\W_]/g, '')
                if (!pubkey.startsWith('0x'))
                    throw Error(`Pubkey '${pubkey}' is incorrect`)
                return pubkey
            })

        // Set inital progress
        setProgress((state) => ({
            ...state,
            isFetching: true,
            members: members.map((pubkey) => ({
                pubkey,
            })),
        }))

        // Deploy GoshDao
        let isDaoDeployed: boolean
        let dao: IGoshDao
        try {
            dao = await retry(
                () => goshRoot.deployDao(name.toLowerCase(), `0x${keys.public}`),
                3,
            )
            isDaoDeployed = true
        } catch (e) {
            isDaoDeployed = false
            throw e
        } finally {
            setProgress((state) => ({ ...state, isDaoDeployed }))
        }

        // Deploy wallets
        await Promise.all(
            members.map(async (pubkey) => {
                // Deploy wallet
                let isDeployed: boolean
                let wallet: IGoshWallet
                try {
                    wallet = await retry(() => dao.deployWallet(pubkey, keys), 3)
                    isDeployed = true
                } catch (e) {
                    isDeployed = false
                    throw e
                } finally {
                    setProgress((state) => ({
                        ...state,
                        members: state.members.map((item) => {
                            if (item.pubkey === pubkey) return { ...item, isDeployed }
                            return item
                        }),
                    }))
                }

                // Mint tokens
                let isMinted: boolean
                try {
                    const smvTokenBalance = await wallet.getSmvTokenBalance()
                    if (!smvTokenBalance) {
                        await retry(() => dao.mint(100, wallet.address, keys), 3)
                    }
                    isMinted = true
                } catch (e) {
                    isMinted = false
                    throw e
                } finally {
                    setProgress((state) => ({
                        ...state,
                        members: state.members.map((item) => {
                            if (item.pubkey === pubkey) return { ...item, isMinted }
                            return item
                        }),
                    }))
                }
            }),
        )

        setProgress((state) => ({ ...state, isFetching: false }))
    }

    return { progress, createDao }
}

function useDaoMemberList(perPage: number) {
    const daoDetails = useRecoilValue(daoAtom)
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

    /** Load next chunk of DAO member list items */
    const onLoadNext = () => {
        setMembers((state) => ({ ...state, page: state.page + 1 }))
    }

    /** Load item details and update corresponging list item */
    const setItemDetails = async (item: TDaoMemberListItem) => {
        if (item.isLoadDetailsFired) return

        setMembers((state) => ({
            ...state,
            items: state.items.map((curr) => {
                if (curr.wallet === item.wallet) {
                    return { ...curr, isLoadDetailsFired: true }
                }
                return curr
            }),
        }))

        const wallet = new GoshWallet(goshClient, item.wallet)
        const details = {
            pubkey: await wallet.getPubkey(),
            smvBalance: await wallet.getSmvTokenBalance(),
        }

        setMembers((state) => ({
            ...state,
            items: state.items.map((curr) => {
                if (curr.wallet === item.wallet) return { ...curr, ...details }
                return curr
            }),
        }))
    }

    /** Get initial DAO members list */
    useEffect(() => {
        const getMemberList = async () => {
            if (!daoDetails?.address) return

            const items = daoDetails.members.map((address) => ({ wallet: address }))
            setMembers((state) => ({
                ...state,
                items: items.sort((a, b) => (a.wallet > b.wallet ? 1 : -1)),
                filtered: items.map((item) => item.wallet),
                isFetching: false,
            }))
        }

        getMemberList()
    }, [daoDetails?.address, daoDetails?.members.length])

    /** Update filtered items and page depending on search */
    useEffect(() => {
        setMembers((state) => {
            return {
                ...state,
                page: search ? 1 : state.page,
                filtered: state.items
                    .filter((item) => {
                        const pattern = new RegExp(search, 'i')
                        return !search || !item.pubkey || item.pubkey.search(pattern) >= 0
                    })
                    .map((item) => item.wallet),
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
            .filter((item) => members.filtered.indexOf(item.wallet) >= 0)
            .slice(0, perPage ? members.page * perPage : members.items.length),
        hasNext: perPage ? members.page * perPage < members.filtered.length : false,
        search,
        setSearch,
        loadNext: onLoadNext,
        loadItemDetails: setItemDetails,
    }
}

function useDaoMemberCreate() {
    const { keys } = useRecoilValue(userStateAtom)
    const [daoDetails, setDaoDetails] = useRecoilState(daoAtom)
    const [progress, setProgress] = useState<TDaoMemberCreateProgress>({
        isFetching: false,
        members: [],
    })

    const createMember = async (members: string[]) => {
        if (!keys) throw new GoshError(EGoshError.NO_USER)
        if (!daoDetails) throw new GoshError(EGoshError.NO_DAO)

        // Validate public keys
        members = members.map((pubkey) => {
            pubkey = pubkey.trim().toLowerCase()
            pubkey = pubkey.replace(/[\W_]/g, '')
            console.debug('pub', pubkey)
            if (!pubkey.startsWith('0x')) throw Error(`Pubkey '${pubkey}' is incorrect`)
            return pubkey
        })

        // Set initial state
        setProgress((state) => ({
            ...state,
            isFetching: true,
            members: members.map((pubkey) => ({
                pubkey,
            })),
        }))

        const dao = new GoshDao(goshClient, daoDetails.address)
        await Promise.all(
            members.map(async (pubkey) => {
                // Deploy wallet
                let isDeployed: boolean
                let wallet: IGoshWallet
                try {
                    wallet = await retry(() => dao.deployWallet(pubkey, keys), 3)
                    isDeployed = true
                } catch (e) {
                    isDeployed = false
                    throw e
                } finally {
                    setProgress((state) => ({
                        ...state,
                        members: state.members.map((item) => {
                            if (item.pubkey === pubkey) return { ...item, isDeployed }
                            return item
                        }),
                    }))
                }

                // Mint tokens
                let isMinted: boolean
                try {
                    const smvTokenBalance = await wallet.getSmvTokenBalance()
                    if (!smvTokenBalance) {
                        await retry(() => dao.mint(100, wallet.address, keys), 3)
                    }
                    isMinted = true
                } catch (e) {
                    isMinted = false
                    throw e
                } finally {
                    setProgress((state) => ({
                        ...state,
                        members: state.members.map((item) => {
                            if (item.pubkey === pubkey) return { ...item, isMinted }
                            return item
                        }),
                    }))
                }

                // Update dao details state
                setDaoDetails((state) => {
                    if (!state) return
                    if (state.members.indexOf(wallet.address) >= 0) return state
                    return {
                        ...state,
                        members: [...state?.members, wallet.address],
                        supply: state.supply + 100,
                    }
                })
            }),
        )

        setProgress((state) => ({ ...state, isFetching: false }))
    }

    return { progress, createMember }
}

function useDaoMemberDelete() {
    const { keys } = useRecoilValue(userStateAtom)
    const [daoDetails, setDaoDetails] = useRecoilState(daoAtom)
    const [fetching, setFetching] = useState<string[]>([])

    const isFetching = (pubkey: string) => fetching.indexOf(pubkey) >= 0

    const deleteMember = async (...pubkeys: string[]) => {
        if (!keys) throw new GoshError(EGoshError.NO_USER)
        if (!daoDetails) throw new GoshError(EGoshError.NO_DAO)

        setFetching((state) => [...state, ...pubkeys])

        const dao = new GoshDao(goshClient, daoDetails.address)
        await Promise.all(
            pubkeys.map(async (pubkey) => {
                const walletAddr = await dao.getWalletAddr(pubkey, 0)
                await retry(() => dao.deleteWallet(pubkey, keys), 3)
                setFetching((state) => state.filter((_pubkey) => _pubkey !== pubkey))
                setDaoDetails((state) => {
                    if (!state) return
                    return {
                        ...state,
                        members: state.members.filter(
                            (address) => address !== walletAddr,
                        ),
                        supply: state.supply - 100,
                    }
                })
            }),
        )
    }

    return { deleteMember, isFetching }
}

export {
    useDaoList,
    useDao,
    useDaoCreate,
    useDaoMemberList,
    useDaoMemberCreate,
    useDaoMemberDelete,
}

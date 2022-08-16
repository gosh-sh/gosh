import { useEffect, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import { getPaginatedAccounts, goshClient, goshRoot } from '../helpers'
import { userStateAtom, daoAtom } from '../store'
import { GoshDao, GoshWallet } from '../classes'
import { sleep } from '../utils'
import { IGoshDao, TDaoCreateProgress, TDaoListItem } from '../types'
import { EGoshError, GoshError } from '../errors'

function useDaoList(perPage: number = 10) {
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

        setDaos({ items: [], filtered: [], page: 1, isFetching: true })
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

    return { dao, details }
}

function useDaoCreate() {
    const { keys } = useRecoilValue(userStateAtom)
    const [progress, setProgress] = useState<TDaoCreateProgress>({
        isFetching: false,
        participants: [],
    })

    const createDao = async (name: string, participants: string[]) => {
        if (!keys) throw new GoshError(EGoshError.NO_USER)

        setProgress((state) => ({
            ...state,
            isFetching: true,
            participants: participants.map((pubkey) => ({
                pubkey,
            })),
        }))

        // Deploy GoshDao
        const dao = await goshRoot.deployDao(name.toLowerCase(), `0x${keys.public}`)
        setProgress((state) => ({ ...state, isDaoDeployed: true }))

        // Deploy wallets
        await Promise.all(
            participants.map(async (pubkey) => {
                // Deploy wallet
                const wallet = await dao.deployWallet(pubkey, keys)
                setProgress((state) => ({
                    ...state,
                    participants: state.participants.map((item) => {
                        if (item.pubkey === pubkey) return { ...item, isDeployed: true }
                        return item
                    }),
                }))

                // Mint tokens
                const smvTokenBalance = await wallet.getSmvTokenBalance()
                if (!smvTokenBalance) {
                    await dao.mint(100, wallet.address, keys)
                }
                setProgress((state) => ({
                    ...state,
                    participants: state.participants.map((item) => {
                        if (item.pubkey === pubkey) return { ...item, isMinted: true }
                        return item
                    }),
                }))
            }),
        )

        setProgress((state) => ({ ...state, isFetching: false }))
    }

    return { progress, createDao }
}

export { useDaoList, useDao, useDaoCreate }

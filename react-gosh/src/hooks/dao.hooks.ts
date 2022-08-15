import { useEffect, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { getPaginatedAccounts, goshClient, goshRoot } from '../helpers'
import { userStateAtom } from '../store'
import { GoshDao, GoshWallet } from '../classes'
import { sleep } from '../utils'
import { TDaoListItem } from '../types'

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

export { useDaoList }

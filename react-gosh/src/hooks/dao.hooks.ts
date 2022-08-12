import { useCallback, useEffect, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { getPaginatedAccounts, goshClient, goshRoot } from '../helpers'
import { userStateAtom } from '../store'
import { GoshDao, GoshWallet, TGoshDaoDetails } from '../types'
import { sleep } from '../utils'

function useDaoList(perPage: number = 10) {
    const userState = useRecoilValue(userStateAtom)
    const [search, setSearch] = useState<string>('')
    const [daos, setDaos] = useState<{
        items: {
            address: string
            name: string
            isLoadDetailsFired?: boolean
            participants?: string[]
            supply?: number
        }[]
        filtered: string[]
        page: number
        isFetching: boolean
    }>({
        items: [],
        filtered: [],
        page: 1,
        isFetching: true,
    })

    useEffect(() => {
        const getDaoList = async () => {
            if (!userState.keys?.public) return

            // Get GoshWallet code by user's pubkey and get all user's wallets
            const walletCode = await goshRoot.getDaoWalletCode(
                `0x${userState.keys.public}`,
            )
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
                items,
                filtered: items.map((item) => item.address),
                page: 1,
                isFetching: false,
            })
        }

        setDaos({ items: [], filtered: [], page: 1, isFetching: true })
        getDaoList()
    }, [])

    return {
        isFetching: daos.isFetching,
        isEmpty: !daos.isFetching && !daos.filtered.length,
        items: daos.items
            .filter((item) => daos.filtered.indexOf(item.address) >= 0)
            .slice(0, daos.page * perPage),
        hasMore: daos.page * perPage < daos.filtered.length,
    }
}

export { useDaoList }

import { faCoins, faUsers } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useRecoilValue } from 'recoil'
import Spinner from '../../components/Spinner'
import {
    GoshDao,
    GoshWallet,
    userStateAtom,
    TGoshDaoDetails,
    getPaginatedAccounts,
    goshClient,
    goshRoot,
} from 'react-gosh'

const DaosPage = () => {
    const userState = useRecoilValue(userStateAtom)
    const [search, setSearch] = useState<string>('')
    const [daos, setDaos] = useState<{
        list: TGoshDaoDetails[]
        lastId?: string
        completed: boolean
        isFetching: boolean
    }>({
        list: [],
        completed: false,
        isFetching: true,
    })

    const getDaoList = useCallback(
        async (lastId?: string) => {
            if (!userState.keys?.public) return
            setDaos((curr) => ({ ...curr, isFetching: true }))

            // Get GoshWallet code by user's pubkey and get all user's wallets
            const walletCode = await goshRoot.getDaoWalletCode(
                `0x${userState.keys.public}`,
            )
            const walletCodeHash = await goshClient.boc.get_boc_hash({
                boc: walletCode,
            })
            const wallets = await getPaginatedAccounts({
                filters: [`code_hash: {eq:"${walletCodeHash.hash}"}`],
                limit: 10,
                lastId,
            })

            // Get unique dao addresses from wallets
            const uniqueDaoAddresses = new Set(
                await Promise.all(
                    wallets.results.map(async (item: any) => {
                        const wallet = new GoshWallet(goshRoot.account.client, item.id)
                        return await wallet.getDaoAddr()
                    }),
                ),
            )

            // Get daos details from unique dao addressed
            const items = await Promise.all(
                Array.from(uniqueDaoAddresses).map(async (address) => {
                    const dao = new GoshDao(goshClient, address)
                    return await dao.getDetails()
                }),
            )

            setDaos((curr) => ({
                ...curr,
                isFetching: false,
                list: [...curr.list, ...items],
                lastId: wallets.lastId,
                completed: wallets.completed,
            }))
        },
        [userState.keys?.public],
    )

    useEffect(() => {
        setDaos({ list: [], isFetching: true, completed: true })
        getDaoList()
    }, [getDaoList])

    return (
        <>
            <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="input basis-full sm:basis-1/2">
                    <input
                        className="element !py-1.5"
                        type="text"
                        placeholder="Search orgranization... (not available now)"
                        autoComplete="off"
                        value={search}
                        disabled={true}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Link
                    to="/account/orgs/create"
                    className="btn btn--body py-1.5 px-3 !font-normal text-center w-full sm:w-auto"
                >
                    New organization
                </Link>
            </div>

            <div className="mt-8">
                {daos.isFetching && !daos.list.length && (
                    <div className="text-gray-606060">
                        <Spinner className="mr-3" />
                        Loading organizations...
                    </div>
                )}
                {!daos.isFetching && !daos.list.length && (
                    <div className="text-gray-606060 text-center">
                        You have no organizations yet
                    </div>
                )}

                <div className="divide-y divide-gray-c4c4c4">
                    {daos.list.map((item, index) => (
                        <div key={index} className="py-3">
                            <Link
                                to={`/${item.name}`}
                                className="text-xl font-semibold hover:underline"
                            >
                                {item.name}
                            </Link>
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-gray-606060 text-sm mt-1">
                                <div>
                                    <FontAwesomeIcon icon={faUsers} className="mr-2" />
                                    Participants: {item.participants.length}
                                </div>
                                <div>
                                    <FontAwesomeIcon icon={faCoins} className="mr-2" />
                                    Total supply: {item.supply}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {!daos.completed && (
                    <div className="text-center mt-3">
                        <button
                            className="btn btn--body font-medium px-4 py-2 w-full sm:w-auto"
                            type="button"
                            disabled={daos.isFetching}
                            onClick={() => getDaoList(daos.lastId)}
                        >
                            {daos.isFetching && <Spinner className="mr-2" />}
                            Load more
                        </button>
                    </div>
                )}
            </div>
        </>
    )
}

export default DaosPage

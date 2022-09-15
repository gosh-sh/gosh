import { useEffect, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import Spinner from '../../components/Spinner'
import { GoshSmvProposal } from 'react-gosh'
import { sleep } from 'react-gosh'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import { getPaginatedAccounts, goshClient } from 'react-gosh'
import SmvBalance from '../../components/SmvBalance/SmvBalance'
import EventListItem from './ListItem'
import { useSmvBalance } from '../../hooks/gosh.hooks'

const EventsPage = () => {
    const pageSize = 10

    const { daoName } = useParams()
    const { dao, wallet } = useOutletContext<TDaoLayoutOutletContext>()
    const smvBalance = useSmvBalance(wallet)
    const [events, setEvents] = useState<{
        items: any[]
        isFetching: boolean
        page: number
    }>({
        items: [],
        isFetching: true,
        page: 1,
    })

    /** Load next chunk of events list items */
    const onLoadMore = () => {
        setEvents((state) => ({ ...state, page: state.page + 1 }))
    }

    /** Load event details and update corresponging list item */
    const setEventDetails = async (address: string, walletAddress?: string) => {
        console.debug('Set event for', address)
        setEvents((state) => ({
            ...state,
            items: state.items.map((item) => {
                if (item.address === address) return { ...item, isBusy: true }
                return item
            }),
        }))

        const event = new GoshSmvProposal(dao.instance.account.client, address)
        const details = await event.getDetails(walletAddress)

        setEvents((state) => ({
            ...state,
            items: state.items.map((item) => {
                if (item.address === address) return { ...item, ...details }
                return item
            }),
        }))
    }

    /** Load events list */
    useEffect(() => {
        const getEventList = async () => {
            // Get events accounts by code
            const code = await dao.instance.getSmvProposalCode()
            const codeHash = await goshClient.boc.get_boc_hash({ boc: code })
            const list: any[] = []
            let next: string | undefined
            while (true) {
                const accounts = await getPaginatedAccounts({
                    filters: [`code_hash: {eq:"${codeHash.hash}"}`],
                    limit: 50,
                    lastId: next,
                })
                const items = await Promise.all(
                    accounts.results.map(async ({ id }) => {
                        const event = new GoshSmvProposal(dao.instance.account.client, id)
                        return {
                            address: event.address,
                            params: await event.getParams(),
                            isCompleted: await event.isCompleted(),
                        }
                    }),
                )
                list.push(...items)
                next = accounts.lastId

                if (accounts.completed) break
                await sleep(200)
            }

            setEvents((state) => ({
                ...state,
                items: list.map((item) => {
                    const found = state.items.find(
                        ({ address }) => address === item.address,
                    )
                    if (found) return { ...found, isBusy: found.isCompleted !== null }
                    return item
                }),
                isFetching: false,
            }))
        }

        setEvents({ items: [], isFetching: true, page: 1 })
        getEventList()

        const interval = setInterval(async () => {
            console.debug('Event list reload')
            await getEventList()
        }, 15000)

        return () => {
            clearInterval(interval)
        }
    }, [dao])

    return (
        <div className="bordered-block px-7 py-8">
            <div>
                <SmvBalance
                    details={smvBalance}
                    wallet={wallet}
                    className="mb-5 bg-gray-100"
                />

                <div className="mb-4">
                    Don't see your event? Please wait, events are reloaded automatically
                </div>

                {events.isFetching && (
                    <div className="text-gray-606060">
                        <Spinner className="mr-3" />
                        Loading events...
                    </div>
                )}

                {!events.isFetching && !events.items.length && (
                    <div className="text-gray-606060 text-center">
                        There are no events yet
                    </div>
                )}

                <div className="divide-y divide-gray-c4c4c4">
                    {events.items.slice(0, events.page * pageSize).map((event, index) => {
                        if (!event.isBusy) setEventDetails(event.address, wallet?.address)
                        return (
                            <EventListItem
                                key={index}
                                daoName={daoName || ''}
                                event={event}
                            />
                        )
                    })}
                </div>

                {events.page * pageSize < events.items.length && (
                    <div className="text-center mt-3">
                        <button
                            className="btn btn--body font-medium px-4 py-2 w-full sm:w-auto"
                            type="button"
                            disabled={events.isFetching}
                            onClick={onLoadMore}
                        >
                            {events.isFetching && <Spinner className="mr-2" />}
                            Load more
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default EventsPage

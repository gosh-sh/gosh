import { useEffect, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import Spinner from '../../components/Spinner'
import { sleep } from 'react-gosh'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import { getPaginatedAccounts, AppConfig } from 'react-gosh'
import SmvBalance from '../../components/SmvBalance/SmvBalance'
import EventListItem from './ListItem'
import { useSmvBalance } from '../../hooks/gosh.hooks'
import { GoshSmvProposal } from 'react-gosh/dist/gosh/0.11.0/goshsmvproposal'

const EventsPage = () => {
    const pageSize = 10

    const { daoName } = useParams()
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const smvBalance = useSmvBalance(dao.adapter, dao.details.isAuthenticated)
    const [events, setEvents] = useState<{
        items: any[]
        isFetching: boolean
        page: number
    }>({
        items: [],
        isFetching: true,
        page: 1,
    })

    /** Get next chunk of events list items */
    const getMore = () => {
        setEvents((state) => ({ ...state, page: state.page + 1 }))
    }

    /** Load event details and update corresponging list item */
    const setEventDetails = async (address: string) => {
        console.debug('Set event for', address)
        setEvents((state) => ({
            ...state,
            items: state.items.map((item) => {
                if (item.address === address) return { ...item, isBusy: true }
                return item
            }),
        }))

        const event = new GoshSmvProposal(AppConfig.goshclient, address)
        const details = await event.getDetails()

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
            const codeHash = await dao.adapter.getSmvProposalCodeHash()
            const list: any[] = []
            let next: string | undefined
            while (true) {
                const accounts = await getPaginatedAccounts({
                    filters: [`code_hash: {eq:"${codeHash}"}`],
                    limit: 50,
                    lastId: next,
                })
                const items = await Promise.all(
                    accounts.results.map(async ({ id }) => {
                        const event = new GoshSmvProposal(AppConfig.goshclient, id)
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
                    details={smvBalance.details}
                    wallet={smvBalance.wallet!}
                    dao={dao}
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
                        if (!event.isBusy) setEventDetails(event.address)
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
                            onClick={getMore}
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

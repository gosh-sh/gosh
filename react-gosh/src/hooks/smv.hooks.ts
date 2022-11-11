import { useEffect, useState } from 'react'
import { MAX_PARALLEL_READ } from '../constants'
import { EGoshError, GoshError } from '../errors'
import { IGoshDaoAdapter, IGoshSmvAdapter } from '../gosh/interfaces'
import { executeByChunk, getAllAccounts } from '../helpers'
import { TAddress, TDao, TSmvDetails, TSmvEvent, TSmvEventListItem } from '../types'

function useSmv(dao: { adapter: IGoshDaoAdapter; details: TDao }) {
    const [adapter, setAdapter] = useState<IGoshSmvAdapter>()
    const [details, setDetails] = useState<TSmvDetails>({
        balance: 0,
        smvAvailable: 0,
        smvLocked: 0,
        isLockerBusy: false,
    })

    useEffect(() => {
        const _getAdapter = async () => {
            const smv = await dao.adapter.getSmv()
            setAdapter(smv)
        }

        _getAdapter()
    }, [])

    useEffect(() => {
        const _getSmvDetails = async () => {
            if (!adapter || !dao.details.isAuthMember) return

            const data = await adapter.getDetails()
            setDetails(data)
        }

        _getSmvDetails()
        const interval = setInterval(async () => await _getSmvDetails(), 10000)

        return () => {
            clearInterval(interval)
        }
    }, [adapter, dao.details.isAuthMember])

    return { adapter, details }
}

function useSmvTokenTransfer(smv?: IGoshSmvAdapter) {
    const [progress, setProgress] = useState<{
        toSmv: boolean
        toWallet: boolean
        releaseAll: boolean
    }>({ toSmv: false, toWallet: false, releaseAll: false })

    const transferToSmv = async (amount: number) => {
        try {
            setProgress((state) => ({ ...state, toSmv: true }))

            if (!smv) throw new GoshError('SMV adapter is undefined')
            await smv.transferToSmv(amount)
        } catch (e) {
            throw e
        } finally {
            setProgress((state) => ({ ...state, toSmv: false }))
        }
    }

    const transferToWallet = async (amount: number) => {
        try {
            setProgress((state) => ({ ...state, toWallet: true }))

            if (!smv) throw new GoshError('SMV adapter is undefined')
            await smv.transferToWallet(amount)
        } catch (e) {
            throw e
        } finally {
            setProgress((state) => ({ ...state, toWallet: false }))
        }
    }

    const releaseAll = async () => {
        try {
            setProgress((state) => ({ ...state, releaseAll: true }))

            if (!smv) throw new GoshError('SMV adapter is undefined')
            await smv.releaseAll()
        } catch (e) {
            throw e
        } finally {
            setProgress((state) => ({ ...state, releaseAll: false }))
        }
    }

    return { transferToSmv, transferToWallet, releaseAll, progress }
}

function useSmvEventList(dao: IGoshDaoAdapter, perPage: number) {
    const [events, setEvents] = useState<{
        items: TSmvEventListItem[]
        page: number
        isFetching: boolean
    }>({
        items: [],
        page: 1,
        isFetching: true,
    })

    /** Get next chunk of event list items */
    const getMore = () => {
        setEvents((state) => ({ ...state, page: state.page + 1 }))
    }

    /** Load item details and update corresponging list item */
    const setItemDetails = async (item: TSmvEventListItem) => {
        if (item.isLoadDetailsFired) return

        setEvents((state) => ({
            ...state,
            items: state.items.map((curr) => {
                if (curr.address === item.address) {
                    return { ...curr, isLoadDetailsFired: true }
                }
                return curr
            }),
        }))

        const details = await item.adapter.getEvent(item.address, true)
        setEvents((state) => ({
            ...state,
            items: state.items.map((curr) => {
                if (curr.address === item.address) return { ...curr, ...details }
                return curr
            }),
        }))
    }

    /** Get initial event list */
    useEffect(() => {
        const _getEventList = async () => {
            const adapter = await dao.getSmv()
            const codeHash = await adapter.getEventCodeHash()
            const accounts = await getAllAccounts({
                filters: [`code_hash: {eq:"${codeHash}"}`],
            })
            const items: any[] = await executeByChunk(
                accounts.map(({ id }) => id),
                MAX_PARALLEL_READ,
                async (address) => {
                    const event = await adapter.getEvent(address, false)
                    return { adapter, ...event }
                },
            )

            setEvents((state) => {
                const merged = [...state.items, ...items]
                return {
                    items: merged.sort((a, b) => {
                        const { completed: aCompleted } = a.status.completed
                        const { completed: bCompleted } = b.status.completed
                        return aCompleted > bCompleted ? -1 : 1
                    }),
                    page: 1,
                    isFetching: false,
                }
            })
        }

        _getEventList()
    }, [])

    /** Refresh event details (reset `isLoadDetailsFired` flag) */
    useEffect(() => {
        const interval = setInterval(() => {
            if (events.isFetching) return

            setEvents((state) => ({
                ...state,
                items: state.items.map((item) => ({
                    ...item,
                    isLoadDetailsFired: item.status.completed,
                })),
            }))
        }, 20000)

        return () => {
            clearInterval(interval)
        }
    }, [events.isFetching])

    return {
        isFetching: events.isFetching,
        isEmpty: !events.isFetching && !events.items.length,
        items: events.items.slice(0, events.page * perPage),
        hasNext: events.page * perPage < events.items.length,
        getMore,
        getItemDetails: setItemDetails,
    }
}

function useSmvEvent(dao: IGoshDaoAdapter, address: TAddress) {
    const [adapter, setAdapter] = useState<IGoshSmvAdapter>()
    const [event, setEvent] = useState<TSmvEvent>()
    const [isFetching, setIsFetching] = useState<boolean>(true)

    useEffect(() => {
        const _getAdapter = async () => {
            const instance = await dao.getSmv()
            setAdapter(instance)
        }

        _getAdapter()
    }, [])

    useEffect(() => {
        const _getEvent = async () => {
            if (!adapter) return

            setIsFetching(true)
            const data = (await adapter.getEvent(address, true)) as TSmvEvent
            setEvent(data)
            setIsFetching(false)

            return data
        }

        _getEvent()
        const interval = setInterval(async () => {
            const data = await _getEvent()
            if (data?.status.completed) clearInterval(interval)
        }, 10000)

        return () => {
            clearInterval(interval)
        }
    }, [adapter, address])

    return { event, isFetching }
}

function useSmvVote(dao: IGoshDaoAdapter, event?: TSmvEvent) {
    const vote = async (choice: boolean, amount: number) => {
        if (!event) throw new GoshError('Event data is undefined')
        if (Date.now() < event.time.start) {
            throw new GoshError(EGoshError.SMV_NO_START, {
                start: new Date(event.time.start).toLocaleString(),
            })
        }

        const smv = await dao.getSmv()
        await smv.vote(event.address, choice, amount)
    }

    return { vote }
}

export { useSmv, useSmvTokenTransfer, useSmvEventList, useSmvEvent, useSmvVote }

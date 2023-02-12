import { useCallback, useEffect, useMemo, useState } from 'react'
import { MAX_PARALLEL_READ } from '../constants'
import { EGoshError, GoshError } from '../errors'
import { IGoshDaoAdapter, IGoshSmvAdapter } from '../gosh/interfaces'
import { executeByChunk, getAllAccounts, getPaginatedAccounts } from '../helpers'
import {
    TAddress,
    TDao,
    TPaginatedAccountsResult,
    TSmvDetails,
    TSmvEvent,
    TSmvEventListItem,
} from '../types'

function useSmv(dao: { adapter: IGoshDaoAdapter; details: TDao }) {
    const [adapter, setAdapter] = useState<IGoshSmvAdapter>()
    const [details, setDetails] = useState<TSmvDetails>({
        smvBalance: 0,
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
            if (!adapter) {
                return
            }

            const data = await adapter.getDetails()
            setDetails(data)
        }

        _getSmvDetails()
        const interval = setInterval(async () => await _getSmvDetails(), 10000)

        return () => {
            clearInterval(interval)
        }
    }, [adapter])

    return { adapter, details }
}

function useSmvTokenTransfer(smv?: IGoshSmvAdapter, dao?: IGoshDaoAdapter) {
    const [progress, setProgress] = useState<{
        toSmv: boolean
        toWallet: boolean
        toInternal: boolean
        toReserve: boolean
        releaseAll: boolean
    }>({
        toSmv: false,
        toWallet: false,
        toInternal: false,
        toReserve: false,
        releaseAll: false,
    })

    const transferToSmv = async (amount: number) => {
        try {
            setProgress((state) => ({ ...state, toSmv: true }))

            if (!smv) {
                throw new GoshError('SMV adapter is undefined')
            }
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

            if (!smv) {
                throw new GoshError('SMV adapter is undefined')
            }
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

            if (!smv) {
                throw new GoshError('SMV adapter is undefined')
            }
            await smv.releaseAll()
        } catch (e) {
            throw e
        } finally {
            setProgress((state) => ({ ...state, releaseAll: false }))
        }
    }

    const transferToInternal = async (username: string, amount: number) => {
        try {
            setProgress((state) => ({ ...state, toInternal: true }))

            if (!dao) {
                throw new GoshError('DAO adapter is undefined')
            }
            await dao.sendInternal2Internal(username, amount)
        } catch (e) {
            throw e
        } finally {
            setProgress((state) => ({ ...state, toInternal: false }))
        }
    }

    const transferToDaoReserve = async (amount: number) => {
        try {
            setProgress((state) => ({ ...state, toReserve: true }))

            if (!dao) {
                throw new GoshError('DAO adapter is undefined')
            }
            await dao.send2DaoReserve(amount)
        } catch (e) {
            throw e
        } finally {
            setProgress((state) => ({ ...state, toReserve: false }))
        }
    }

    return {
        transferToSmv,
        transferToWallet,
        transferToInternal,
        transferToDaoReserve,
        releaseAll,
        progress,
    }
}

function useSmvEventList(
    dao: IGoshDaoAdapter,
    params: { perPage?: number; latest?: boolean },
) {
    const [adapter, setAdapter] = useState<IGoshSmvAdapter>()
    const [eventCodeHash, setEventCodehash] = useState<string>()
    const [events, setEvents] = useState<{
        isFetching: boolean
        items: TSmvEventListItem[]
        lastTransLt?: string
        hasNext?: boolean
    }>({ items: [], isFetching: false })

    const { perPage = 5, latest = false } = params

    const getEventList = useCallback(
        async (from?: string) => {
            if (!adapter || !eventCodeHash) {
                return
            }

            setEvents((state) => ({ ...state, isFetching: true }))
            const accounts = await getPaginatedAccounts({
                filters: [`code_hash: {eq:"${eventCodeHash}"}`],
                limit: perPage,
                lastTransLt: from,
            })
            if (latest) {
                await _getEventListLatest(adapter, accounts)
            } else {
                await _getEventListCommon(adapter, accounts)
            }
        },
        [adapter, eventCodeHash, perPage, latest],
    )

    const getMore = async () => {
        await getEventList(events.lastTransLt)
    }

    const getItemDetails = async (item: TSmvEventListItem) => {
        if (item.isLoadDetailsFired) {
            return
        }

        setEvents((state) => ({
            ...state,
            items: state.items.map((curr) => {
                if (curr.address === item.address) {
                    return { ...curr, isLoadDetailsFired: true }
                }
                return curr
            }),
        }))

        const details = {
            time: await item.adapter.getEventTime({ address: item.address }),
            votes: await item.adapter.getEventVotes({ address: item.address }),
        }
        setEvents((state) => ({
            ...state,
            items: state.items.map((curr) => {
                if (curr.address === item.address) return { ...curr, ...details }
                return curr
            }),
        }))
    }

    const _getEventListCommon = async (
        adapter: IGoshSmvAdapter,
        accounts: TPaginatedAccountsResult,
    ) => {
        const items: TSmvEventListItem[] = await executeByChunk(
            accounts.results.map(({ id }) => id),
            MAX_PARALLEL_READ,
            async (address) => {
                const event = await adapter.getEvent(address, false)
                return { adapter, ...event }
            },
        )

        setEvents((state) => ({
            ...state,
            isFetching: false,
            items: [...state.items, ...items],
            lastTransLt: accounts.lastTransLt,
            hasNext: !accounts.completed,
        }))

        for (const item of items) {
            getItemDetails(item)
        }
    }

    const _getEventListLatest = async (
        adapter: IGoshSmvAdapter,
        accounts: TPaginatedAccountsResult,
    ) => {
        const items: TSmvEventListItem[] = await executeByChunk(
            accounts.results.map(({ id }) => id),
            MAX_PARALLEL_READ,
            async (address) => {
                const event = await adapter.getEvent(address, false)
                return {
                    adapter,
                    time: await adapter.getEventTime({ address }),
                    ...event,
                }
            },
        )

        setEvents((state) => ({
            ...state,
            isFetching: false,
            items,
            lastTransLt: accounts.lastTransLt,
            hasNext: !accounts.completed,
        }))
    }

    /** Get smv adapter */
    useEffect(() => {
        const _getAdapter = async () => {
            const _adapter = await dao.getSmv()
            setAdapter(_adapter)
        }
        _getAdapter()
    }, [dao])

    /** Get event code hash */
    useEffect(() => {
        const _getEventCodeHash = async () => {
            if (!adapter) {
                return
            }
            const hash = await adapter.getEventCodeHash()
            setEventCodehash(hash)
        }
        _getEventCodeHash()
    }, [adapter])

    /** Initial loading */
    useEffect(() => {
        getEventList()
    }, [getEventList])

    /**
     * Refresh event list
     * Reset `isLoadDetailsFired` flag or reload whole list
     * in case of `latest=true`
     * */
    useEffect(() => {
        const interval = setInterval(async () => {
            if (events.isFetching) {
                return
            }

            if (latest) {
                await getEventList()
            } else {
                setEvents((state) => ({
                    ...state,
                    items: state.items.map((item) => ({
                        ...item,
                        isLoadDetailsFired: item.status.completed,
                    })),
                }))
            }
        }, 20000)

        return () => {
            clearInterval(interval)
        }
    }, [events.isFetching, latest])

    return {
        isFetching: events.isFetching,
        isEmpty: !events.isFetching && !events.items.length,
        items: events.items,
        hasNext: events.hasNext,
        getMore,
        getItemDetails,
    }
}

function useSmvEvent(dao: IGoshDaoAdapter, address: TAddress) {
    const [adapter, setAdapter] = useState<IGoshSmvAdapter>()
    const [event, setEvent] = useState<{ isFetching: boolean; item?: TSmvEvent | null }>({
        isFetching: false,
    })

    useEffect(() => {
        const _getAdapter = async () => {
            const instance = await dao.getSmv()
            setAdapter(instance)
        }

        _getAdapter()
    }, [dao])

    useEffect(() => {
        const _getEvent = async () => {
            if (!adapter) {
                return
            }

            setEvent((state) => ({ ...state, isFetching: true }))
            const data = (await adapter.getEvent(address, true)) as TSmvEvent
            setEvent((state) => ({ ...state, item: data, isFetching: false }))
        }

        _getEvent()
        const interval = setInterval(async () => {
            if (adapter) {
                const status = await adapter.getEventStatus({ address })
                const time = await adapter.getEventTime({ address })
                const votes = await adapter.getEventVotes({ address })
                setEvent((state) => ({
                    ...state,
                    item: state.item
                        ? { ...state.item, status, time, votes }
                        : state.item,
                }))
                if (status.completed) {
                    clearInterval(interval)
                }
            }
        }, 10000)

        return () => {
            clearInterval(interval)
        }
    }, [adapter, address])

    return { event: event.item, isFetching: event.isFetching }
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

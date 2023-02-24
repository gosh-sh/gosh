import { useCallback, useEffect, useState } from 'react'
import { MAX_PARALLEL_READ } from '../constants'
import { EGoshError, GoshError } from '../errors'
import { IGoshDaoAdapter, IGoshSmvAdapter } from '../gosh/interfaces'
import { executeByChunk, getAllAccounts } from '../helpers'
import { TAddress, TDao, TSmvDetails, TSmvEvent, TSmvEventListItem } from '../types'

function useSmv(dao: { adapter: IGoshDaoAdapter; details: TDao }) {
    const [adapter, setAdapter] = useState<IGoshSmvAdapter>()
    const [details, setDetails] = useState<TSmvDetails>({
        smvBalance: 0,
        smvAvailable: 0,
        smvLocked: 0,
        isLockerBusy: false,
        allowance: 0,
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

        let _intervalLock = false
        const interval = setInterval(async () => {
            if (!_intervalLock) {
                _intervalLock = true
                await _getSmvDetails()
                _intervalLock = false
            }
        }, 10000)

        const intervalRelease = setInterval(async () => {
            await adapter?.releaseAll()
        }, 30000)

        return () => {
            clearInterval(interval)
            clearInterval(intervalRelease)
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

function useSmvEventList(dao: IGoshDaoAdapter, params: { perPage?: number }) {
    const [adapter, setAdapter] = useState<IGoshSmvAdapter>()
    const [accounts, setAccounts] = useState<{
        isFetching: boolean
        items: { id: TAddress; last_paid: number }[]
    }>({ isFetching: false, items: [] })
    const [events, setEvents] = useState<{
        isFetching: boolean
        items: TSmvEventListItem[]
        lastAccountIndex: number
        hasNext?: boolean
    }>({ items: [], isFetching: false, lastAccountIndex: 0 })

    const { perPage = 5 } = params

    const getEventAccounts = useCallback(async () => {
        setAccounts((state) => ({ ...state, isFetching: true }))

        const adapter = await dao.getSmv()
        const codeHash = await adapter.getEventCodeHash()
        const result = await getAllAccounts({
            filters: [`code_hash: {eq:"${codeHash}"}`],
            result: ['last_paid'],
        })

        setAdapter(adapter)
        setAccounts((state) => ({
            ...state,
            isFetching: false,
            items: result.sort((a, b) => b.last_paid - a.last_paid),
        }))
    }, [dao])

    const getEventList = useCallback(
        async (lastAccountIndex: number) => {
            if (!adapter || accounts.isFetching) {
                return
            }

            setEvents((state) => ({ ...state, isFetching: true }))

            const endAccountIndex = lastAccountIndex + perPage
            const items: TSmvEventListItem[] = await executeByChunk(
                accounts.items.slice(lastAccountIndex, endAccountIndex),
                MAX_PARALLEL_READ,
                async ({ id }) => {
                    const event = await adapter.getEvent(id, false)
                    return { adapter, ...event }
                },
            )

            setEvents((state) => ({
                ...state,
                isFetching: false,
                items: [...state.items, ...items],
                lastAccountIndex: endAccountIndex,
                hasNext: endAccountIndex < accounts.items.length,
            }))
        },
        [adapter, accounts.isFetching, accounts.items, perPage],
    )

    const getMore = async () => {
        await getEventList(events.lastAccountIndex)
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

        let details = {}
        if (dao.getVersion() === '1.0.0') {
            details = {
                status: await item.adapter.getEventStatus({
                    address: item.address,
                }),
                time: await item.adapter.getEventTime({ address: item.address }),
                votes: await item.adapter.getEventVotes({ address: item.address }),
            }
        } else {
            details = await item.adapter.getEvent(item.address, false)
        }
        setEvents((state) => ({
            ...state,
            items: state.items.map((curr) => {
                if (curr.address === item.address) return { ...curr, ...details }
                return curr
            }),
        }))
    }

    /** Get all event accounts */
    useEffect(() => {
        getEventAccounts()
    }, [getEventAccounts])

    /** Initial loading */
    useEffect(() => {
        getEventList(0)
    }, [getEventList])

    /**
     * Refresh event list
     * Reset `isLoadDetailsFired` flag
     * */
    useEffect(() => {
        const interval = setInterval(async () => {
            if (accounts.isFetching || events.isFetching) {
                return
            }

            setEvents((state) => ({
                ...state,
                items: state.items.map((item) => ({
                    ...item,
                    isLoadDetailsFired: item.status?.completed,
                })),
            }))
        }, 20000)

        return () => {
            clearInterval(interval)
        }
    }, [accounts.isFetching, events.isFetching])

    return {
        isFetching: accounts.isFetching || events.isFetching,
        isEmpty: !accounts.isFetching && !events.isFetching && !events.items.length,
        items: events.items,
        hasNext: events.hasNext,
        getMore,
        getItemDetails,
    }
}

function useSmvEvent(dao: IGoshDaoAdapter, address: TAddress) {
    const [adapter, setAdapter] = useState<
        { version: string; instance: IGoshSmvAdapter } | undefined
    >()
    const [event, setEvent] = useState<{ isFetching: boolean; item?: TSmvEvent | null }>({
        isFetching: false,
    })

    useEffect(() => {
        const _getAdapter = async () => {
            const instance = await dao.getSmv()
            setAdapter({ version: dao.getVersion(), instance })
        }

        _getAdapter()
    }, [dao])

    useEffect(() => {
        const _getEvent = async () => {
            if (!adapter) {
                return
            }

            setEvent((state) => ({ ...state, isFetching: true }))
            const data = (await adapter.instance.getEvent(address, true)) as TSmvEvent
            setEvent((state) => ({ ...state, item: data, isFetching: false }))
        }

        _getEvent()

        let _intervalLock = false
        const interval = setInterval(async () => {
            if (adapter && !_intervalLock) {
                _intervalLock = true

                let details: any = {
                    reviewers: await adapter.instance.getEventReviewers({ address }),
                }
                if (adapter.version === '1.0.0') {
                    details = {
                        ...details,
                        status: await adapter.instance.getEventStatus({ address }),
                        time: await adapter.instance.getEventTime({ address }),
                        votes: await adapter.instance.getEventVotes({ address }),
                    }
                } else {
                    const _details = await adapter.instance.getEvent(address, false)
                    details = { ...details, ..._details }
                }

                setEvent((state) => ({
                    ...state,
                    item: state.item ? { ...state.item, ...details } : state.item,
                }))

                _intervalLock = false
                if (details.status.completed) {
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

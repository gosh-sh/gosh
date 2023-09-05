import { GoshError } from './errors'
import moment from 'moment'

export const shortString = (
    data: string,
    start: number = 6,
    end: number = 6,
    delimiter: string = '...',
): string => {
    if (data.length <= start + end) return data

    const left = data.substring(0, start)
    const right = data.substring(data.length - end)
    return `${left}${delimiter}${right}`
}

export const getDurationDelta = (time: number) => {
    const ms = moment(time).diff(moment())
    const delta = moment.duration(ms)
    return `${delta.days()}d ${delta.hours()}h ${delta.minutes()}m`
}

export const sleep = (ms: number = 0) => {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export const whileFinite = async (
    fn: any,
    msDelay: number = 5000,
    msTimeout: number = 120000,
): Promise<boolean> => {
    while (msTimeout > 0) {
        try {
            if (await fn()) return true
        } catch {}
        await sleep(msDelay)
        msTimeout -= msDelay
        console.debug(`[WhileFinite] msTimeout`, msTimeout)
    }
    return false
}

export const retry = async (fn: Function, maxAttempts: number) => {
    const delay = (fn: Function, ms: number) => {
        return new Promise((resolve) => setTimeout(() => resolve(fn()), ms))
    }

    const execute = async (attempt: number) => {
        try {
            return await fn()
        } catch (err) {
            const isGoshError = err instanceof GoshError

            if (attempt <= maxAttempts && !isGoshError) {
                const nextAttempt = attempt + 1
                const delayInMs = 2000
                console.error(`Retrying after ${delayInMs} ms due to:`, err)
                return delay(() => execute(nextAttempt), delayInMs)
            } else {
                throw err
            }
        }
    }
    return execute(1)
}

export const splitByChunk = <T>(array: T[], chunkSize: number = 10): T[][] => {
    const chunks = []
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
}

export const executeByChunk = async <Input, Output>(
    array: Input[],
    chunkSize: number,
    executor: (params: Input, index: number) => Promise<Output>,
): Promise<Output[]> => {
    const result: Output[] = []
    const chunks = splitByChunk(array, chunkSize)
    for (const [index, chunk] of chunks.entries()) {
        const part = await Promise.all(
            chunk.map(async (params, i) => await executor(params, index * chunkSize + i)),
        )
        result.push(...part)
        await sleep(300)
    }
    return result
}

export const setLockableInterval = (callback: () => Promise<void>, timeout: number) => {
    let locked = false

    const interval = setInterval(async () => {
        if (!locked) {
            locked = true
            await callback()
            locked = false
        }
    }, timeout)

    return interval
}

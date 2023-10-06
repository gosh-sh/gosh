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

export const roundNumber = (value: number | string, precision: number = 5) => {
    const multiplier = 10 ** precision
    const floatvalue = parseFloat(value.toString())
    return Math.round(floatvalue * multiplier) / multiplier
}

export const getDurationDelta = (time: number, format: string) => {
    const ms = moment(time).diff(moment())
    const delta = moment.duration(ms)

    const parsed = []
    while (format) {
        const sindex = format.indexOf('[')
        const eindex = format.indexOf(']')
        const group = format.slice(sindex + 1, eindex)
        format = format.slice(eindex + 1)

        const nindex = format.indexOf('[')
        const delimiter = format.slice(0, nindex)
        format = format.slice(nindex)

        parsed.push([group, delimiter])
    }

    const filled = parsed.map(([group, delimiter]) => {
        const [sign, label] = group.split(':').concat('')

        let value = 0
        if (sign === 'd') {
            value = delta.days()
        } else if (sign === 'h') {
            value = delta.hours()
        } else if (sign === 'm') {
            value = delta.minutes()
        } else if (sign === 's') {
            value = delta.seconds()
        }
        return `${value}${label}${delimiter}`
    })
    return filled.join('')
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

/**
 * web3js.utils.fromWei
 * https://github.com/web3/web3.js/blob/4.x/packages/web3-utils/src/converters.ts
 */
export const fromBigint = (number: bigint, decimals: number) => {
    const value = number.toString()

    if (decimals <= 0) {
        return value.toString()
    }

    // pad the value with required zeros (e.g. decimals = 6)
    // 13456789 -> 13456789, 1234 -> 001234
    const zeroPaddedValue = value.padStart(decimals, '0')

    // get the integer part of value by counting number of zeros from start
    // 13456789 -> '13'
    // 001234 -> ''
    const integer = zeroPaddedValue.slice(0, -decimals)

    // get the fraction part of value by counting number of zeros backward
    // 13456789 -> '456789'
    // 001234 -> '001234'
    const fraction = zeroPaddedValue.slice(-decimals).replace(/\.?0+$/, '')

    if (integer === '' && fraction === '') {
        return '0'
    }

    if (integer === '') {
        return `0.${fraction}`
    }

    if (fraction === '') {
        return integer
    }

    return `${integer}.${fraction}`
}

/**
 * web3js.utils.toWei
 * https://github.com/web3/web3.js/blob/4.x/packages/web3-utils/src/converters.ts
 */
export const toBigint = (number: string, decimals: number) => {
    // if value is decimal e.g. 24.56 extract `integer` and `fraction` part
    // to avoid `fraction` to be null use `concat` with empty string
    const [integer, fraction] = number.split('.').concat('')

    // join the value removing `.` from
    // 24.56 -> 2456
    const value = BigInt(`${integer}${fraction}`)

    // multiply value with decimals
    // 2456 * 1000000 -> 2456000000
    const updatedValue = value * BigInt(10 ** decimals)

    // check which either `fraction` or `decimals` have lower number of zeros
    const _decimals = Math.min(fraction.length, decimals)

    if (_decimals === 0) {
        return updatedValue
    }

    // Add zeros to make length equal to required decimal points
    // If string is larger than decimal points required then remove last zeros
    return BigInt(updatedValue.toString().padStart(_decimals, '0').slice(0, -_decimals))
}

function timeout(ms: number) {
    return new Promise((_resolve, reject) => setTimeout(reject, ms))
}

export function runWithTimeout(timeoutMs: number, promise: Promise<unknown>) {
    return Promise.race([timeout(timeoutMs), promise])
}

export const lockToStr = (period: number): string => {
    const months = Math.floor(period / 2592000)
    const seconds = Math.floor(period % 2592000)
    return `${months} mo` + (seconds !== 0 ? `${seconds} s` : '')
}

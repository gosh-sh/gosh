export function isValidName(name: string, field?: string): boolean {
    field = field || 'Name'

    const matchSymbols = name.match(/^[\w-]+$/g)
    if (!matchSymbols || matchSymbols[0] !== name) {
        return false
    }

    const matchHyphens = name.match(/-{2,}/g)
    if (matchHyphens && matchHyphens.length > 0) {
        return false
    }

    const matchUnderscores = name.match(/_{2,}/g)
    if (matchUnderscores && matchUnderscores.length > 0) {
        return false
    }

    if (name.startsWith('-')) {
        return false
    }

    if (name.startsWith('_')) {
        return false
    }

    if (name.toLowerCase() !== name) {
        return false
    }

    if (name.length > 39) {
        return false
    }

    return true
}

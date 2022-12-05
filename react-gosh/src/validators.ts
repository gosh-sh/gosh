import { AppConfig } from './appconfig'
import { TValidationResult } from './types'

const validateUsername = (username: string): TValidationResult => {
    if (!username.startsWith('@')) {
        return { valid: false, reason: 'Username has no leading @' }
    }

    const matches = username.match(/^@[\w-]+/g)
    if (!matches || matches[0] !== username) {
        return { valid: false, reason: 'Username has incorrect symbols' }
    }

    if (username.length > 64) {
        return { valid: false, reason: 'Username is too long (>64)' }
    }

    return { valid: true }
}

const validatePhrase = async (phrase: string): Promise<TValidationResult> => {
    const validated = await AppConfig.goshclient.crypto.mnemonic_verify({
        phrase,
    })
    if (!validated.valid) return { valid: false }
    return { valid: true }
}

export { validateUsername, validatePhrase }

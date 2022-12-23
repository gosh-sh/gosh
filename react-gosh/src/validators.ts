import { AppConfig } from './appconfig'
import { TValidationResult } from './types'

const validatePhrase = async (phrase: string): Promise<TValidationResult> => {
    const validated = await AppConfig.goshclient.crypto.mnemonic_verify({
        phrase,
    })
    if (!validated.valid) return { valid: false }
    return { valid: true }
}

export { validatePhrase }

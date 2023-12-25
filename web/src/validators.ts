import { AppConfig } from './appconfig'
import { TValidationResult } from './types/validator.types'
import * as yup from 'yup'

export const validatePhrase = async (phrase: string): Promise<TValidationResult> => {
  const validated = await AppConfig.goshclient.crypto.mnemonic_verify({
    phrase,
  })
  if (!validated.valid) {
    return { valid: false }
  }
  return { valid: true }
}

export const validateEmail = (email: string) => {
  const schema = yup.string().email()
  return schema.isValidSync(email)
}

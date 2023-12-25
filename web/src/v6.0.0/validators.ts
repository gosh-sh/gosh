import { EGoshError } from '../errors'
import { TValidationResult } from '../types/validator.types'
import { getSystemContract } from './blockchain/helpers'

export const validateUsername = (name: string): TValidationResult => {
  const field = 'Username'
  const matchSymbols = name.match(/^[\w-]+$/g)
  if (!matchSymbols || matchSymbols[0] !== name) {
    return { valid: false, reason: `${field} has incorrect symbols` }
  }

  const matchHyphens = name.match(/-{2,}/g)
  if (matchHyphens && matchHyphens.length > 0) {
    return { valid: false, reason: `${field} can not contain consecutive "-"` }
  }

  const matchUnderscores = name.match(/_{2,}/g)
  if (matchUnderscores && matchUnderscores.length > 0) {
    return { valid: false, reason: `${field} can not contain consecutive "_"` }
  }

  if (name.startsWith('-')) {
    return { valid: false, reason: `${field} can not start with "-"` }
  }

  if (name.startsWith('_')) {
    return { valid: false, reason: `${field} can not start with "_"` }
  }

  if (name.toLowerCase() !== name) {
    return { valid: false, reason: `${field} should be lowercase` }
  }

  if (name.length > 39) {
    return { valid: false, reason: `${field} is too long (Max length is 39)` }
  }

  return { valid: true }
}

export const validateDaoName = (name: string): TValidationResult => {
  const field = 'DAO name'
  const matchSymbols = name.match(/^[\w-]+$/g)
  if (!matchSymbols || matchSymbols[0] !== name) {
    return { valid: false, reason: `${field} has incorrect symbols` }
  }

  const matchHyphens = name.match(/-{2,}/g)
  if (matchHyphens && matchHyphens.length > 0) {
    return { valid: false, reason: `${field} can not contain consecutive "-"` }
  }

  const matchUnderscores = name.match(/_{2,}/g)
  if (matchUnderscores && matchUnderscores.length > 0) {
    return { valid: false, reason: `${field} can not contain consecutive "_"` }
  }

  if (name.startsWith('-')) {
    return { valid: false, reason: `${field} can not start with "-"` }
  }

  if (name.startsWith('_')) {
    return { valid: false, reason: `${field} can not start with "_"` }
  }

  if (name.toLowerCase() !== name) {
    return { valid: false, reason: `${field} should be lowercase` }
  }

  if (name.length > 39) {
    return { valid: false, reason: `${field} is too long (Max length is 39)` }
  }

  return { valid: true }
}

export const validateRepoName = (name: string): TValidationResult => {
  const field = 'Repository name'
  const matchSymbols = name.match(/^[\w-]+$/g)
  if (!matchSymbols || matchSymbols[0] !== name) {
    return { valid: false, reason: `${field} has incorrect symbols` }
  }

  const matchHyphens = name.match(/-{2,}/g)
  if (matchHyphens && matchHyphens.length > 0) {
    return { valid: false, reason: `${field} can not contain consecutive "-"` }
  }

  const matchUnderscores = name.match(/_{2,}/g)
  if (matchUnderscores && matchUnderscores.length > 0) {
    return { valid: false, reason: `${field} can not contain consecutive "_"` }
  }

  if (name.startsWith('-')) {
    return { valid: false, reason: `${field} can not start with "-"` }
  }

  if (name.startsWith('_')) {
    return { valid: false, reason: `${field} can not start with "_"` }
  }

  if (name.toLowerCase() !== name) {
    return { valid: false, reason: `${field} should be lowercase` }
  }

  if (name.length > 39) {
    return { valid: false, reason: `${field} is too long (Max length is 39)` }
  }

  return { valid: true }
}

export const validateOnboardingDao = async (name: string): Promise<TValidationResult> => {
  const validated = validateDaoName(name)
  if (!validated.valid) {
    return validated
  }

  const dao = await getSystemContract().getDaoProfile(name)
  if (await dao.isDeployed()) {
    return { valid: false, reason: EGoshError.DAO_EXISTS }
  }

  return { valid: true }
}

export const validateOnboardingRepo = async (
  dao: string,
  name: string,
): Promise<TValidationResult> => {
  const validated = validateRepoName(name)
  if (!validated.valid) {
    return validated
  }

  const repo = await getSystemContract().getRepository({
    path: `${dao}/${name}`,
  })
  if (await repo.isDeployed()) {
    return { valid: false, reason: 'Repository already exists' }
  }

  return { valid: true }
}

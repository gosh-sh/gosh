import { TApplicationForm, TUserSelectOption } from './form.types'

export enum EICCreateStep {
  ROLES = 'roles',
  REWARDS = 'rewards',
  REPOSITORY = 'repository',
  DOCUMENTS = 'documents',
  FORMS = 'forms',
}

export type TICCreateState = {
  step: { name: EICCreateStep; params: { [key: string]: any } }
  roles: {
    scientist: TUserSelectOption[]
    developer: TUserSelectOption[]
    issuer: TUserSelectOption[]
  }
  task: {
    name: string
    reward: number
    scientist: number
    issuer: number
    lock: number
    vesting: number
    comment: string
  } | null
  repository: { name: string; description?: string } | null
  documents: File[]
  forms: TApplicationForm[]
}

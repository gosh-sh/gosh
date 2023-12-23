import { TValidationResult } from '../../types/validator.types'

export enum EDaoInviteStatus {
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  REVOKED = 'revoked',
  PROPOSAL_CREATED = 'proposal_created',
}

export type TOnboardingData = {
  step?:
    | 'signin'
    | 'invites'
    | 'organizations'
    | 'phrase'
    | 'phrase-check'
    | 'username'
    | 'complete'
  invites: {
    items: TOnboardingInvite[]
    isFetching: boolean
  }
  organizations: {
    items: TOnboardingOrganization[]
    isFetching: boolean
  }
  phrase: string[]
  isEmailPublic: boolean
  username: string
  emailOther: string
  redirectTo?: string
}

export type TOnboardingOrganization = {
  id: string
  name: string
  avatar: string
  description: string
  isUser: boolean
  isOpen: boolean
  repositories: {
    items: TOnboardingRepository[]
    isFetching: boolean
    page: number
    hasNext: boolean
  }
}

export type TOnboardingRepository = {
  daoname: string
  id: number
  name: string
  description: string
  updatedAt: string
  isSelected: boolean
}

export type TOnboardingInvite = {
  id: string
  daoname: string
  accepted: boolean | null
}

export type TOnboardingStatusDao = {
  name: string
  repos: TOnboardingStatusRepo[]
  progress: { uploaded: number; total: number }
  shouldUpdate?: boolean
  validated?: TValidationResult
  isOpen: boolean
}

export type TOnboardingStatusRepo = {
  id: string
  name: string
  goshUrl: string
  updatedAt: string
  isUploaded: boolean
  shouldUpdate?: boolean
  validated?: TValidationResult
}

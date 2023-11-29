import { Octokit } from '@octokit/core'
import { atom, selector, selectorFamily } from 'recoil'
import { contextVersion } from '../constants'
import {
    TOnboardingData,
    TOnboardingOrganization,
    TOnboardingRepository,
    TOnboardingStatusDao,
} from '../types/onboarding.types'
import { OAuthSessionAtom } from './oauth.state'

export const onboardingDataAtom = atom<TOnboardingData>({
    key: `OnboardingDataAtom_${contextVersion}`,
    default: {
        organizations: { items: [], isFetching: false },
        emailOther: '',
    },
})

export const onboardingStatusDataAtom = atom<{
    isFetching: boolean
    items: TOnboardingStatusDao[]
}>({
    key: `OnboardingStatusDataAtom_${contextVersion}`,
    default: { isFetching: false, items: [] },
})

export const octokitSelector = selector<Octokit>({
    key: `OctokitSelector_${contextVersion}`,
    get: ({ get }) => {
        const session = get(OAuthSessionAtom)
        return new Octokit({ auth: session.session?.provider_token })
    },
})

export const organizationsSelector = selector<{
    items: TOnboardingOrganization[]
    isFetching: boolean
}>({
    key: `OrganizationsSelector_${contextVersion}`,
    get: ({ get }) => {
        return get(onboardingDataAtom).organizations
    },
    set: ({ set }, value) => {
        set(onboardingDataAtom, (state) => ({
            ...state,
            organizations: value as any,
        }))
    },
})

export const repositoriesCheckedSelector = selector<TOnboardingRepository[]>({
    key: `RepositoriesCheckedSelector_${contextVersion}`,
    get: ({ get }) => {
        const checked = []
        const { organizations } = get(onboardingDataAtom)
        for (const organization of organizations.items) {
            checked.push(...organization.repositories.items.filter((r) => !!r.isSelected))
        }
        return checked
    },
})

export const repositoriesSelector = selectorFamily<
    TOnboardingOrganization['repositories'],
    string | number
>({
    key: `RepositoriesSelector_${contextVersion}`,
    get:
        (organizationId: string | number) =>
        ({ get }) => {
            const { organizations } = get(onboardingDataAtom)
            const found = organizations.items.find((o) => o.id === organizationId)
            return found
                ? found.repositories
                : { items: [], isFetching: false, page: 1, hasNext: false }
        },
    set:
        (organizationId: string | number) =>
        ({ set }, value) => {
            set(onboardingDataAtom, (state) => ({
                ...state,
                organizations: {
                    ...state.organizations,
                    items: state.organizations.items.map((o) => {
                        if (o.id !== organizationId) {
                            return o
                        }
                        return { ...o, repositories: value as any }
                    }),
                },
            }))
        },
})

import { Octokit } from '@octokit/core'
import { Session } from '@supabase/supabase-js'
import { atom, selector, selectorFamily } from 'recoil'
import {
    TOnboardingInvite,
    TOnboardingOrganization,
    TOnboardingRepository,
} from './onboarding.types'

export const OAuthSessionAtom = atom<{
    session: Session | null
    isLoading: boolean
}>({
    key: 'OAuthSessionAtom',
    default: { session: null, isLoading: false },
})

export const onboardingDataAtom = atom<{
    step?: 'signin' | 'invites' | 'organizations' | 'phrase' | 'username' | 'complete'
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
}>({
    key: 'OnboardingDataAtom',
    default: {
        invites: { items: [], isFetching: false },
        organizations: { items: [], isFetching: false },
        phrase: [],
        isEmailPublic: true,
        username: '',
        emailOther: '',
    },
})

export const octokitSelector = selector<Octokit>({
    key: 'OctokitSelector',
    get: ({ get }) => {
        const session = get(OAuthSessionAtom)
        return new Octokit({ auth: session.session?.provider_token })
    },
})

export const organizationsSelector = selector<{
    items: TOnboardingOrganization[]
    isFetching: boolean
}>({
    key: 'OrganizationsSelector',
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
    key: 'RepositoriesCheckedSelector',
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
    key: 'RepositoriesSelector',
    get:
        (organizationId: string | number) =>
        ({ get }) => {
            const { organizations } = get(onboardingDataAtom)
            const found = organizations.items.find((o) => o.id === organizationId)
            return found ? found.repositories : { items: [], isFetching: false }
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

export const daoInvitesSelector = selector<{
    items: TOnboardingInvite[]
    isFetching: boolean
}>({
    key: 'DaoInvitesSelector',
    get: ({ get }) => {
        return get(onboardingDataAtom).invites
    },
    set: ({ set }, value) => {
        set(onboardingDataAtom, (state) => ({
            ...state,
            invites: value as any,
        }))
    },
})

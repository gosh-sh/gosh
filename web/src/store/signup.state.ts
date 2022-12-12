import { Octokit } from '@octokit/core'
import { Session } from '@supabase/supabase-js'
import { AppConfig } from 'react-gosh'
import { atom, selector, selectorFamily } from 'recoil'

export const githubSessionAtom = atom<{
    session: Session | null
    isLoading: boolean
}>({
    key: 'SignupGithubSessionAtom',
    default: { session: null, isLoading: true },
})

export const githubOrganizationsAtom = atom<{ items: any[]; isFetching: boolean }>({
    key: 'SignupGithubOrganizationsAtom',
    default: {
        items: [],
        isFetching: false,
    },
})

export const githubRepositoriesAtom = atom<{
    [orgId: string]: { items: any[]; isFetching: boolean }
}>({
    key: 'SignupGithubRepositoriesAtom',
    default: {},
})

export const signupStepAtom = atom<{ index: number; data?: any } | undefined>({
    key: 'SignupStepAtom',
    default: undefined,
})

export const octokitSelector = selector({
    key: 'SignupOctokitSelector',
    get: ({ get }) => {
        const session = get(githubSessionAtom)
        return new Octokit({ auth: session.session?.provider_token })
    },
})

export const githubRepositoriesSelector = selectorFamily({
    key: 'SignupGithubRepositoriesSelector',
    get:
        (organizationId: string) =>
        ({ get }) => {
            const repos = get(githubRepositoriesAtom)
            return repos[organizationId]
        },
})

export const githubRepositoriesSelectedSelector = selector({
    key: 'SigninGithubRepositoriesSelectedSelector',
    get: ({ get }) => {
        const goshAddress = Object.values(AppConfig.versions).reverse()[0]
        const goshUrlPart = `gosh://${goshAddress}`

        const orgs = get(githubOrganizationsAtom)
        const repos = get(githubRepositoriesAtom)

        const selected: any[] = []
        for (const [key, value] of Object.entries(repos)) {
            const githubOrg = orgs.items.find((item) => item.id.toString() === key)

            const filtered = value.items?.filter((item) => item.isSelected)
            filtered.forEach((item) => {
                const githubUrl = `/${githubOrg.login}/${item.name}`
                const goshUrl = `${goshUrlPart}/${githubOrg.login.toLowerCase()}/${item.name.toLowerCase()}`
                selected.push([githubUrl, goshUrl])
            })
        }
        return selected
    },
})

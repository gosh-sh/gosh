import _ from 'lodash'
import { useCallback, useEffect } from 'react'
import {
  useRecoilState,
  useRecoilValue,
  useResetRecoilState,
  useSetRecoilState,
} from 'recoil'
import { AppConfig } from '../../appconfig'
import { PERSIST_REDIRECT_KEY } from '../../constants'
import { GoshError } from '../../errors'
import { appToastStatusSelector } from '../../store/app.state'
import { supabase } from '../../supabase'
import {
  octokitSelector,
  onboardingDataAtom,
  onboardingStatusDataAtom,
  organizationsSelector,
  repositoriesCheckedSelector,
  repositoriesSelector,
} from '../store/onboarding.state'
import { TOAuthSession } from '../types/oauth.types'
import {
  TOnboardingOrganization,
  TOnboardingRepository,
  TOnboardingStatusDao,
} from '../types/onboarding.types'
import { validateOnboardingDao, validateOnboardingRepo } from '../validators'
import { useOauth } from './oauth.hooks'
import { useUser } from './user.hooks'

export function useOnboardingData(
  oauth?: TOAuthSession,
  options?: { initialize?: boolean },
) {
  const { initialize } = options || {}
  const [status, setStatus] = useRecoilState(appToastStatusSelector('__onboardingupload'))
  const user = useUser()
  const { signout } = useOauth()
  const [data, setData] = useRecoilState(onboardingDataAtom)
  const resetData = useResetRecoilState(onboardingDataAtom)
  const [organizations, setOrganizations] = useRecoilState(organizationsSelector)
  const repositoriesChecked = useRecoilValue(repositoriesCheckedSelector)
  const octokit = useRecoilValue(octokitSelector)

  const getOrganizations = async () => {
    if (!octokit || !oauth?.session) {
      return
    }

    setOrganizations((state) => ({ ...state, isFetching: true }))
    const { data } = await octokit.request('GET /user/orgs{?per_page,page}', {})
    const combined = [
      {
        id: oauth.session.user.id,
        name: oauth.session.user.user_metadata.user_name,
        avatar: oauth.session.user.user_metadata.avatar_url,
        description: '',
        isUser: true,
        isOpen: false,
      },
      ...data.map((item: any) => {
        const { id, login, avatar_url, description } = item
        return {
          id,
          name: login,
          avatar: avatar_url,
          description,
          isUser: false,
          isOpen: false,
        }
      }),
    ]
    setOrganizations((state) => ({
      ...state,
      items: combined.map((item: any, index: number) => {
        const isOpen = index === 0
        const found = state.items.find((i) => i.id === item.id)
        if (found) {
          return { ...found, ...item, isOpen }
        }
        return {
          ...item,
          repositories: { items: [], isFetching: false },
          isOpen,
        }
      }),
      isFetching: false,
    }))
  }

  const toggleOrganization = (id: number | string) => {
    setOrganizations((state) => ({
      ...state,
      items: state.items.map((item) => {
        return item.id === id ? { ...item, isOpen: !item.isOpen } : item
      }),
    }))
  }

  const upload = async (params: { email: string }) => {
    const { email } = params

    try {
      if (!user.persist.username || !oauth?.session?.user.id) {
        throw new GoshError('Value error', 'User undefined')
      }

      // Create DB record for current username
      let dbUser = await _getDbUser(user.persist.username)
      if (!dbUser) {
        throw new GoshError('Value error', 'User is not found in onboarding database')
      }

      // Create one more record of db user because of RLS
      // TODO: Replace with update when backend service appears
      dbUser = await _createDbUser({
        username: dbUser.gosh_username,
        pubkey: dbUser.gosh_pubkey,
        authid: oauth?.session?.user.id,
        email: dbUser.email,
        emailextra: email,
      })

      // Save auto clone repositories
      const goshAddress = AppConfig.versions[AppConfig.getLatestVersion()]
      const goshProtocol = `gosh://${goshAddress}`
      for (const item of repositoriesChecked) {
        const { daoname, name } = item
        await _createDbGithubRecord({
          user_id: dbUser.id,
          github_url: `/${daoname}/${name}`,
          gosh_url: `${goshProtocol}/${daoname.toLowerCase()}/${name.toLowerCase()}`,
        })
      }

      // Validate onboarding data
      const validated = await Promise.all(
        repositoriesChecked.map(async (item) => {
          const daoname = item.daoname.toLowerCase()
          const reponame = item.name.toLowerCase()
          const daoValidation = await validateOnboardingDao(daoname)
          if (!daoValidation.valid) {
            return false
          }
          const repoValidation = await validateOnboardingRepo(daoname, reponame)
          if (!repoValidation.valid) {
            return false
          }
          return true
        }),
      )

      setData((state) => ({
        ...state,
        emailOther: email || oauth?.session?.user.email || '',
        step: 'complete',
      }))
      const valid = validated.every((r) => !!r)
      if (valid) {
        const redirect = localStorage.getItem(PERSIST_REDIRECT_KEY)
        localStorage.removeItem(PERSIST_REDIRECT_KEY)
        setData((state) => ({
          ...state,
          redirectTo: redirect || '/a/orgs',
        }))
        await signout()
      } else {
        setData((state) => ({ ...state, redirectTo: '/onboarding/status' }))
      }
    } catch (e: any) {
      setStatus((state) => ({ ...state, type: 'error', data: e }))
      throw e
    }
  }

  const updateData = (data?: object) => {
    setData((state) => ({ ...state, ...data }))
  }

  const _getDbUser = async (username: string) => {
    const { data, error } = await supabase.client
      .from('users')
      .select()
      .eq('gosh_username', username)
      .single()
    if (error?.code === 'PGRST116') {
      return null
    }
    if (error) {
      throw new GoshError(error.message)
    }
    return data
  }

  const _createDbUser = async (params: {
    username: string
    pubkey: string
    authid: string
    email: string | null
    emailextra: string | null
  }) => {
    const { username, pubkey, authid, email, emailextra } = params
    const { data, error } = await supabase.client
      .from('users')
      .insert({
        gosh_username: username,
        gosh_pubkey: pubkey,
        auth_user: authid,
        email,
        email_other: emailextra,
      })
      .select()
      .single()
    if (error) {
      throw new GoshError(error.message)
    }
    return data
  }

  const _createDbGithubRecord = async (item: {
    user_id: string
    github_url: string
    gosh_url: string
  }) => {
    const { user_id, github_url, gosh_url } = item
    const { count, error } = await supabase.client
      .from('github')
      .select('*', { count: 'exact' })
      .eq('user_id', user_id)
      .eq('github_url', github_url)
      .eq('gosh_url', gosh_url)
    if (error) {
      throw new Error(error.message)
    }

    if (!count) {
      const { error } = await supabase.client.from('github').insert(item)
      if (error) {
        throw new Error(error.message)
      }
    }
  }

  useEffect(() => {
    if (initialize && !data.redirectTo) {
      if (oauth?.isLoading) {
        setData((state) => ({ ...state, step: undefined }))
      } else if (!oauth?.session?.user.id) {
        setData((state) => ({ ...state, step: 'signin' }))
      } else {
        setData((state) => ({ ...state, step: state.step || 'organizations' }))
      }
    }
  }, [initialize, oauth?.isLoading, oauth?.session?.user.id, data.redirectTo])

  return {
    data,
    organizations,
    repositories: {
      selected: repositoriesChecked,
    },
    getOrganizations,
    toggleOrganization,
    upload,
    uploadStatus: status,
    updateData,
    resetData,
  }
}

export function useOnboardingRepositories(organization: TOnboardingOrganization) {
  const octokit = useRecoilValue(octokitSelector)
  const setOnboardingData = useSetRecoilState(onboardingDataAtom)
  const [repositories, setRepositories] = useRecoilState(
    repositoriesSelector(organization.id),
  )

  const getRepositories = useCallback(
    async (page: number = 1, per_page: number = 30) => {
      if (!octokit) {
        return
      }

      setRepositories((state) => ({ ...state, isFetching: true }))
      const { data } = organization.isUser
        ? await octokit.request(
            'GET /user/repos{?visibility,affiliation,type,sort,direction,per_page,page,since,before}',
            {
              visibility: 'public',
              affiliation: 'owner',
              page,
              per_page,
            },
          )
        : await octokit.request(
            'GET /orgs/{org}/repos{?type,sort,direction,per_page,page}',
            {
              org: organization.name,
              type: 'public',
              page,
              per_page,
            },
          )

      const items = data.map((item: any) => ({
        daoname: organization.name,
        id: item.id,
        name: item.name,
        description: item.description,
        updatedAt: item.updated_at,
      }))
      setRepositories((state) => {
        const different = _.differenceWith(
          items,
          state.items,
          (a: any, b: any) => a.id === b.id,
        ).map((item) => ({ ...item, isSelected: false }))
        const intersect = _.intersectionWith(
          items,
          state.items,
          (a: any, b: any) => a.id === b.id,
        )

        return {
          ...state,
          items: [...state.items, ...different].map((item: any) => {
            const found = intersect.find((i) => i.id === item.id)
            return found || item
          }),
          hasNext: items.length >= per_page,
          isFetching: false,
        }
      })
    },
    [octokit, organization.name, organization.isUser],
  )

  const toggleRepository = (item: TOnboardingRepository) => {
    setRepositories((state) => ({
      ...state,
      items: state.items.map((s) => {
        if (s.id !== item.id) {
          return s
        }
        return { ...item, isSelected: !item.isSelected }
      }),
    }))
  }

  const getNext = () => {
    setOnboardingData((state) => ({
      ...state,
      organizations: {
        ...state.organizations,
        items: state.organizations.items.map((o) => {
          if (o.id !== organization.id) {
            return o
          }

          const page = o.repositories.page || 1
          return { ...o, repositories: { ...o.repositories, page: page + 1 } }
        }),
      },
    }))
  }

  useEffect(() => {
    getRepositories(repositories.page)
  }, [repositories.page])

  return { repositories, getRepositories, getNext, toggleRepository }
}

export function useOnboardingStatus(oauth?: TOAuthSession) {
  const { signout: _signout } = useOauth()
  const [data, setData] = useRecoilState(onboardingStatusDataAtom)
  const resetData = useResetRecoilState(onboardingStatusDataAtom)

  const signout = async () => {
    await _signout()
    resetData()
  }

  const getData = async () => {
    if (!oauth?.session) {
      return
    }

    try {
      setData((state) => ({ ...state, isFetching: true }))

      // Get user's onboarding data
      const { data, error } = await supabase.client
        .from('users')
        .select(`*, github (id, updated_at, gosh_url)`)
        .eq('auth_user', oauth.session.user.id)
      if (error) {
        throw new GoshError('Get status data', error.message)
      }

      // Group onboarding data by DAO name
      const grouped: TOnboardingStatusDao[] = []
      for (const { github } of data) {
        for (const item of github) {
          const [dao, repo] = item.gosh_url.split('/').slice(-2)

          let daoIndex = grouped.findIndex((i) => i.name === dao)
          if (daoIndex < 0) {
            grouped.push({
              name: dao,
              repos: [],
              progress: { uploaded: 0, total: 0 },
              isOpen: false,
            })
            daoIndex = grouped.length - 1
          }

          const repoIndex = grouped[daoIndex].repos.findIndex((i) => i.id === item.id)
          if (repoIndex < 0) {
            const { repos, progress } = grouped[daoIndex]
            const isUploaded = item.updated_at !== null
            repos.push({
              id: item.id,
              name: repo,
              goshUrl: item.gosh_url,
              updatedAt: item.updated_at,
              isUploaded,
            })
            progress.total += 1
            progress.uploaded += isUploaded ? 1 : 0
          }
        }
      }

      // Validate onboarding data (DAO, repositories)
      await Promise.all(
        grouped.map(async (item) => {
          item.validated = undefined
          if (item.progress.uploaded === 0) {
            const validated = await validateOnboardingDao(item.name)
            item.validated = validated
            item.shouldUpdate = !validated.valid
          }
          if (item.validated?.valid === false) {
            return
          }

          await Promise.all(
            item.repos.map(async (repo) => {
              repo.validated = undefined
              if (!repo.isUploaded) {
                const validated = await validateOnboardingRepo(item.name, repo.name)
                repo.validated = validated
                repo.shouldUpdate = !validated.valid
              }
            }),
          )
        }),
      )
      setData((state) => ({ ...state, items: grouped }))
    } catch (e: any) {
      throw e
    } finally {
      setData((state) => ({ ...state, isFetching: false }))
    }
  }

  const toggleDao = (name: string) => {
    setData((state) => ({
      ...state,
      items: state.items.map((item) => {
        if (item.name !== name) {
          return item
        }
        return { ...item, isOpen: !item.isOpen }
      }),
    }))
  }

  const setDaoName = async (index: number, value: string) => {
    setData((state) => ({
      ...state,
      items: state.items.map((item, i) => {
        if (i !== index) {
          return item
        }
        return { ...item, name: value }
      }),
    }))
    await validateDaoNameDebounce(index, value)
  }

  const setRepoName = async (id: string, dao: string, value: string) => {
    setData((state) => ({
      ...state,
      items: state.items.map((item) => {
        if (item.name !== dao) {
          return item
        }

        const repos = item.repos.map((repo) => {
          if (repo.id !== id) {
            return repo
          }
          return { ...repo, name: value }
        })
        return { ...item, repos }
      }),
    }))
    await validateRepoNameDebounce(id, dao, value)
  }

  const submit = async () => {
    try {
      // Prepare data to be sent do database
      const prepared: { id: string; gosh_url: string }[] = []
      for (const dao of data.items) {
        for (const repo of dao.repos) {
          if (!dao.shouldUpdate && !repo.shouldUpdate) {
            continue
          }

          const parts = repo.goshUrl.split('/')
          parts[parts.length - 2] = dao.name
          parts[parts.length - 1] = repo.name
          prepared.push({ id: repo.id, gosh_url: parts.join('/') })
        }
      }

      // Update prepared items in database
      for (const item of prepared) {
        const { id, gosh_url } = item
        const { error } = await supabase.client
          .from('github')
          .update({ gosh_url, ignore: false })
          .eq('id', id)
        if (error) {
          throw new GoshError(error.message)
        }
      }
    } catch (e: any) {
      throw e
    }
  }

  const validateDaoNameDebounce = _.debounce(async (index: number, value: string) => {
    const validated = await validateOnboardingDao(value)
    setData((state) => ({
      ...state,
      items: state.items.map((item, i) => {
        if (i !== index) {
          return item
        }
        return {
          ...item,
          validated,
          repos: item.repos.map((repo) => ({
            ...repo,
            validated: validated.valid ? undefined : repo.validated,
          })),
        }
      }),
    }))
  }, 500)

  const validateRepoNameDebounce = _.debounce(
    async (id: string, dao: string, value: string) => {
      const validated = await validateOnboardingRepo(dao, value)
      setData((state) => ({
        ...state,
        items: state.items.map((item) => {
          if (item.name !== dao) {
            return item
          }

          const repos = item.repos.map((repo) => {
            if (repo.id !== id) {
              return repo
            }
            return { ...repo, validated }
          })
          return { ...item, repos }
        }),
      }))
    },
    500,
  )

  return { data, getData, toggleDao, setDaoName, setRepoName, submit, signout }
}

import {
  useRecoilState,
  useRecoilValue,
  useResetRecoilState,
  useSetRecoilState,
} from 'recoil'
import {
  daoInvitesSelector,
  octokitSelector,
  onboardingDataAtom,
  onboardingStatusDataAtom,
  organizationsSelector,
  repositoriesCheckedSelector,
  repositoriesSelector,
} from '../store/onboarding.state'
import { supabase } from '../../supabase'
import { useCallback, useEffect } from 'react'
import { TOAuthSession } from '../types/oauth.types'
import {
  EDaoInviteStatus,
  TOnboardingInvite,
  TOnboardingOrganization,
  TOnboardingRepository,
  TOnboardingStatusDao,
} from '../types/onboarding.types'
import { GoshError } from '../../errors'
import { AppConfig } from '../../appconfig'
import { useUser } from './user.hooks'
import { validateOnboardingDao, validateOnboardingRepo } from '../validators'
import { debounce } from 'lodash'
import { useOauth } from './oauth.hooks'
import _ from 'lodash'
import { appToastStatusSelector } from '../../store/app.state'

export function useOnboardingData(oauth?: TOAuthSession) {
  const [data, setData] = useRecoilState(onboardingDataAtom)
  const resetData = useResetRecoilState(onboardingDataAtom)
  const [organizations, setOrganizations] = useRecoilState(organizationsSelector)
  const [invites, setInvites] = useRecoilState(daoInvitesSelector)
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

  const getDaoInvites = async () => {
    if (!oauth?.session) {
      return
    }

    setInvites((state) => ({ ...state, isFetching: true }))
    const { data, error } = await supabase.client
      .from('dao_invite')
      .select('id, dao_name')
      .eq('recipient_email', oauth.session.user.email)
      .is('recipient_status', null)
    if (error) {
      setInvites({ isFetching: false, items: [] })
      throw new GoshError('Get DAO invites', error.message)
    }
    setInvites((state) => ({
      ...state,
      items: data.map((item) => {
        const found = state.items.find((i) => i.id === item.id)
        if (found) {
          return found
        }
        return { id: item.id, daoname: item.dao_name, accepted: null }
      }),
      isFetching: false,
    }))

    return !!data.length
  }

  const toggleDaoInvite = (status: boolean, item: TOnboardingInvite) => {
    setInvites((state) => ({
      ...state,
      items: state.items.map((i) => {
        if (i.id !== item.id) {
          return i
        }
        return { ...item, accepted: status }
      }),
    }))
  }

  const updateData = (data?: object) => {
    setData((state) => ({ ...state, ...data }))
  }

  useEffect(() => {
    if (oauth && !data.redirectTo) {
      setData((state) => {
        const { isLoading, session } = oauth
        if (isLoading) {
          return { ...state, step: undefined }
        }
        if (!session) {
          return { ...state, step: 'signin' }
        }
        return { ...state, step: state.step || 'invites' }
      })
    }
  }, [oauth, data.redirectTo, setData])

  return {
    data,
    invites,
    organizations,
    repositories: {
      selected: repositoriesChecked,
    },
    getOrganizations,
    toggleOrganization,
    getDaoInvites,
    toggleDaoInvite,
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

export function useOnboardingSignup(oauth: TOAuthSession) {
  const data = useRecoilValue(onboardingDataAtom)
  const repositories = useRecoilValue(repositoriesCheckedSelector)
  const invites = useRecoilValue(daoInvitesSelector)
  const { signup: _signup } = useUser()
  const [status, setStatus] = useRecoilState(appToastStatusSelector('__onboardingsignup'))

  const getDbUser = async (username: string) => {
    const { data, error } = await supabase.client
      .from('users')
      .select()
      .eq('gosh_username', username)
      .single()
    if (error?.code === 'PGRST116') return null
    if (error) {
      throw new GoshError(error.message)
    }
    return data
  }

  const createDbUser = async (
    username: string,
    pubkey: string,
    authUserId: string,
    email: string | null,
    emailOther: string | null,
  ) => {
    const { data, error } = await supabase.client
      .from('users')
      .insert({
        gosh_username: username,
        gosh_pubkey: `0x${pubkey}`,
        auth_user: authUserId,
        email,
        email_other: emailOther,
      })
      .select()
      .single()
    if (error) {
      throw new GoshError(error.message)
    }
    return data
  }

  const createDbGithubRecord = async (item: {
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

  const signup = async (username: string) => {
    try {
      if (!oauth.session) {
        throw new GoshError('OAuth session undefined')
      }

      // Prepare data
      setStatus((state) => ({ ...state, type: 'pending', data: 'Prepare data' }))
      username = username.trim().toLowerCase()
      const seed = data.phrase.join(' ')
      const keypair = await AppConfig.goshclient.crypto.mnemonic_derive_sign_keys({
        phrase: seed,
      })

      // Deploy GOSH account
      setStatus((state) => ({
        ...state,
        type: 'pending',
        data: 'Create GOSH account',
      }))
      await _signup({ phrase: seed, username })

      // Get or create DB user
      setStatus((state) => ({
        ...state,
        type: 'pending',
        data: 'Update onboarding DB',
      }))
      let dbUser = await getDbUser(username)
      if (!dbUser) {
        dbUser = await createDbUser(
          username,
          keypair.public,
          oauth.session.user.id,
          data.isEmailPublic ? oauth.session.user.email || null : null,
          data.emailOther || null,
        )
      }

      // Save auto clone repositories
      const goshAddress = Object.values(AppConfig.versions).reverse()[0]
      const goshProtocol = `gosh://${goshAddress}`
      for (const item of repositories) {
        const { daoname, name } = item
        await createDbGithubRecord({
          user_id: dbUser.id,
          github_url: `/${daoname}/${name}`,
          gosh_url: `${goshProtocol}/${daoname.toLowerCase()}/${name.toLowerCase()}`,
        })
      }

      // Update DAO invites status
      for (const invite of invites.items) {
        const { error } = await supabase.client
          .from('dao_invite')
          .update({
            recipient_username: username,
            recipient_status: invite.accepted
              ? EDaoInviteStatus.ACCEPTED
              : EDaoInviteStatus.REJECTED,
            token_expired: true,
          })
          .eq('id', invite.id)
        if (error) {
          throw new GoshError(error.message)
        }
      }

      // Validate onboarding data
      const validationResult = await Promise.all(
        repositories.map(async (item) => {
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
      setStatus((state) => ({ ...state, type: 'dismiss', data: null }))
      return validationResult.every((r) => !!r)
    } catch (e: any) {
      setStatus((state) => ({ ...state, type: 'error', data: e }))
      throw e
    }
  }

  return { signup, status }
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

  const validateDaoNameDebounce = debounce(async (index: number, value: string) => {
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

  const validateRepoNameDebounce = debounce(
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

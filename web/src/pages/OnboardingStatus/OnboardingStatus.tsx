import { faRotateRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useCallback, useEffect, useState } from 'react'
import { debounce } from 'lodash'
import { GoshError, TValidationResult } from 'react-gosh'
import { toast } from 'react-toastify'
import { useRecoilState, useResetRecoilState, useSetRecoilState } from 'recoil'
import ToastError from '../../components/Error/ToastError'
import Spinner from '../../components/Spinner'
import { signoutOAuthSupabase, singinOAuthSupabase, supabase } from '../../helpers'
import { OAuthSessionAtom } from '../../store/onboarding.state'
import ListEmpty from '../Onboarding/components/ListEmpty'
import DaoListItem from './DaoListItem'
import { validateOnboardingDao, validateOnboardingRepo } from '../Onboarding/helpers'
import Profile from './Profile'
import { useNavigate } from 'react-router-dom'
import { onboardingDataAtom } from '../../store/onboarding.state'

export type TOnboardingDao = {
    name: string
    repos: TOnboardingRepo[]
    progress: { uploaded: number; total: number }
    shouldUpdate?: boolean
    validated?: TValidationResult
    isOpen: boolean
}

export type TOnboardingRepo = {
    id: string
    name: string
    goshUrl: string
    updatedAt: string
    isUploaded: boolean
    shouldUpdate?: boolean
    validated?: TValidationResult
}

const OnboardingStatusPage = () => {
    const [oAuthSession, setOAuthSession] = useRecoilState(OAuthSessionAtom)
    const navigate = useNavigate()
    const resetOAuthSession = useResetRecoilState(OAuthSessionAtom)
    const setOnboarding = useSetRecoilState(onboardingDataAtom)
    const [onboardingData, setOnboardingData] = useState<{
        isFetching: boolean
        items: TOnboardingDao[]
    }>({ isFetching: false, items: [] })

    const signinOAuth = async () => {
        try {
            await singinOAuthSupabase('github', document.location.href)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    const signoutOAuth = async () => {
        try {
            await signoutOAuthSupabase()
            resetOAuthSession()
            setOnboarding((state) => ({ ...state, redirectTo: undefined }))
            setOnboardingData({ isFetching: false, items: [] })
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    const getOnboardingData = useCallback(async () => {
        if (!oAuthSession.session) {
            return
        }

        setOnboardingData((state) => ({ ...state, isFetching: true }))

        // Get user's onboarding data
        const { data } = await supabase
            .from('users')
            .select(`*, github (id, updated_at, gosh_url)`)
            .eq('auth_user', oAuthSession.session.user.id)
        if (!data?.length) return

        // Group onboarding data by DAO name
        const grouped: TOnboardingDao[] = []
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

                const repoIndex = grouped[daoIndex].repos.findIndex(
                    (i) => i.id === item.id,
                )
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
                            const validated = await validateOnboardingRepo(
                                item.name,
                                repo.name,
                            )
                            repo.validated = validated
                            repo.shouldUpdate = !validated.valid
                        }
                    }),
                )
            }),
        )

        setOnboardingData({ isFetching: false, items: grouped })
    }, [oAuthSession.session])

    const debouncedDaoNameValidation = useCallback(
        debounce(async (index: number, value: string) => {
            const validated = await validateOnboardingDao(value)
            setOnboardingData((state) => ({
                ...state,
                items: state.items.map((item, i) => {
                    if (i !== index) {
                        return item
                    }
                    return {
                        ...item,
                        validated,
                        name: value,
                        repos: item.repos.map((repo) => ({
                            ...repo,
                            validated: validated.valid ? undefined : repo.validated,
                        })),
                    }
                }),
            }))
        }, 500),
        [],
    )

    const debouncedRepoNameValidation = useCallback(
        debounce(async (id: string, dao: string, value: string) => {
            const validated = await validateOnboardingRepo(dao, value)
            setOnboardingData((state) => ({
                ...state,
                items: state.items.map((item) => {
                    if (item.name !== dao) {
                        return item
                    }

                    const repos = item.repos.map((repo) => {
                        if (repo.id !== id) {
                            return repo
                        }
                        return { ...repo, validated, name: value }
                    })
                    return { ...item, repos }
                }),
            }))
        }, 500),
        [],
    )

    const onDaoToggle = (name: string) => {
        setOnboardingData((state) => ({
            ...state,
            items: state.items.map((item) => {
                if (item.name !== name) {
                    return item
                }
                return { ...item, isOpen: !item.isOpen }
            }),
        }))
    }

    const onDaoNameChange = async (index: number, value: string) => {
        setOnboardingData((state) => ({
            ...state,
            items: state.items.map((item, i) => {
                if (i !== index) {
                    return item
                }
                return { ...item, name: value }
            }),
        }))
        await debouncedDaoNameValidation(index, value)
    }

    const onRepoNameChange = async (id: string, dao: string, value: string) => {
        setOnboardingData((state) => ({
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
        await debouncedRepoNameValidation(id, dao, value)
    }

    const submitOnboardingData = async () => {
        try {
            // Prepare data to be sent do database
            const prepared: { id: string; gosh_url: string }[] = []
            for (const dao of onboardingData.items) {
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
                const { error } = await supabase
                    .from('github')
                    .update({ gosh_url, ignore: false })
                    .eq('id', id)
                if (error) {
                    throw new GoshError(error.message)
                }
            }

            await signoutOAuth()
            navigate('/a/orgs', { replace: true })
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    useEffect(() => {
        const _getOAuthSession = async () => {
            setOAuthSession({ session: null, isLoading: true })
            const { data } = await supabase.auth.getSession()
            setOAuthSession({ session: data.session, isLoading: false })
        }

        _getOAuthSession()
    }, [setOAuthSession])

    useEffect(() => {
        getOnboardingData()
    }, [getOnboardingData])

    return (
        <div className="container">
            {oAuthSession.isLoading && (
                <div className="text-gray-606060 text-sm py-3">
                    <Spinner className="mr-3" />
                    Please, wait...
                </div>
            )}

            <div className="signup signup--organizations">
                <div className="signup__aside signup__aside--step aside-step">
                    <Profile
                        data={onboardingData.items}
                        signinOAuth={signinOAuth}
                        signoutOAuth={signoutOAuth}
                        onSubmit={submitOnboardingData}
                    />
                </div>
                <div className="signup__content">
                    <div className="signup__reload-items">
                        <button
                            type="button"
                            disabled={onboardingData.isFetching}
                            onClick={getOnboardingData}
                        >
                            {onboardingData.isFetching ? (
                                <Spinner size="xs" className="icon" />
                            ) : (
                                <FontAwesomeIcon icon={faRotateRight} className="icon" />
                            )}
                            Refresh
                        </button>
                    </div>

                    {!onboardingData.isFetching && !onboardingData?.items.length && (
                        <ListEmpty />
                    )}

                    {onboardingData.items.map((item, index) => (
                        <DaoListItem
                            key={index}
                            item={item}
                            index={index}
                            onDaoToggle={onDaoToggle}
                            onDaoNameChange={onDaoNameChange}
                            onRepoNameChange={onRepoNameChange}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

export default OnboardingStatusPage

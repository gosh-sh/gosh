import { faArrowRightFromBracket, faRotateRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Transition } from '@headlessui/react'
import { useCallback, useEffect } from 'react'
import { classNames } from 'react-gosh'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import Spinner from '../../components/Spinner'
import {
    githubOrganizationsAtom,
    githubRepositoriesAtom,
    githubRepositoriesSelectedSelector,
    oAuthSessionAtom,
    octokitSelector,
    signupStepAtom,
} from '../../store/signup.state'
import GithubEmpty from './GithubEmpty'
import GithubRepositories from './GithubRepositories'

type TGithubOrganizationsProps = {
    signoutOAuth(): Promise<void>
}

const GithubOrganizations = (props: TGithubOrganizationsProps) => {
    const { signoutOAuth } = props
    const { session } = useRecoilValue(oAuthSessionAtom)
    const [githubOrgs, setGithubOrgs] = useRecoilState(githubOrganizationsAtom)
    const githubRepos = useRecoilValue(githubRepositoriesAtom)
    const githubReposSelected = useRecoilValue(githubRepositoriesSelectedSelector)
    const octokit = useRecoilValue(octokitSelector)
    const setStep = useSetRecoilState(signupStepAtom)

    const toggleOrganization = (id: number) => {
        setGithubOrgs((state) => {
            const { items } = state
            return {
                ...state,
                items: items.map((item) => {
                    return item.id === id ? { ...item, isOpen: !item.isOpen } : item
                }),
            }
        })
    }

    const getGithubOrganizations = useCallback(async () => {
        if (!octokit || !session) return

        setGithubOrgs((state) => ({ ...state, isFetching: true }))
        try {
            const { data } = await octokit.request('GET /user/orgs{?per_page,page}', {})
            const combined = [
                {
                    id: session.user.id,
                    login: session.user.user_metadata.user_name,
                    avatar_url: session.user.user_metadata.avatar_url,
                    isUser: true,
                    isOpen: false,
                },
                ...data.map((item: any) => ({ ...item, isUser: false, isOpen: false })),
            ]
            setGithubOrgs((state) => {
                const items = combined.map((item: any) => {
                    const exists = state.items.find(
                        (curr: any) => curr.login === item.login,
                    )
                    return exists || item
                })
                return { items, isFetching: false }
            })
        } catch (e: any) {
            console.error(e.message)
            await signoutOAuth()
            return
        }
    }, [octokit, session, setGithubOrgs, signoutOAuth])

    useEffect(() => {
        getGithubOrganizations()
    }, [getGithubOrganizations])

    if (!session) return null
    return (
        <div className="signup signup--organizations">
            <div className="signup__aside signup__aside--step aside-step">
                <div className="aside-step__header">
                    <button
                        type="button"
                        className="aside-step__btn-signout"
                        onClick={signoutOAuth}
                    >
                        <div className="aside-step__btn-signout-slide">
                            <span className="aside-step__btn-signout-user">
                                Hey, {session.user.user_metadata.name}
                            </span>
                            <span className="aside-step__btn-signout-text">Sign out</span>
                        </div>
                        <FontAwesomeIcon
                            icon={faArrowRightFromBracket}
                            size="lg"
                            className="aside-step__btn-signout-icon"
                        />
                    </button>
                </div>

                <p className="aside-step__text">
                    Select GitHub organization to
                    <span className="aside-step__text-blue">
                        &nbsp;create your DAO on GOSH
                    </span>
                </p>

                <button
                    type="button"
                    className="aside-step__btn-upload"
                    onClick={() => setStep({ index: 2 })}
                    disabled={!githubReposSelected.length}
                >
                    Upload
                </button>
            </div>
            <div className="signup__content">
                <div className="signup__reload-items">
                    <button
                        type="button"
                        disabled={githubOrgs.isFetching}
                        onClick={getGithubOrganizations}
                    >
                        {githubOrgs.isFetching ? (
                            <Spinner size="xs" className="icon" />
                        ) : (
                            <FontAwesomeIcon icon={faRotateRight} className="icon" />
                        )}
                        Refresh
                    </button>
                </div>

                {!githubOrgs?.isFetching && !githubOrgs?.items.length && <GithubEmpty />}

                {githubOrgs.items.map((item, index) => {
                    const selected = githubRepos[item.id]?.items
                        .filter((item) => item.isSelected)
                        .map((item, index) => (
                            <span key={index} className="orgitem__repo">
                                {item.name}
                            </span>
                        ))

                    return (
                        <div key={index} className="signup__orgitem orgitem">
                            <div
                                className="orgitem__main"
                                onClick={() => {
                                    toggleOrganization(item.id)
                                }}
                            >
                                <div className="orgitem__media">
                                    <img src={item.avatar_url} alt="" />
                                </div>
                                <div className="orgitem__content">
                                    <div className="orgitem__header">
                                        <div className="orgitem__title">{item.login}</div>
                                        <div
                                            className={classNames(
                                                'orgitem__arrow',
                                                item.isOpen
                                                    ? 'orgitem__arrow-open'
                                                    : null,
                                            )}
                                        >
                                            <i className="icon-arrow"></i>
                                        </div>
                                    </div>

                                    <p className="orgitem__description">
                                        {item.description}
                                    </p>

                                    <div className="orgitem__footer">
                                        {selected?.length
                                            ? selected
                                            : 'Select repository'}
                                    </div>
                                </div>
                            </div>
                            <div className="orgitem__footer orgitem__footer--xs">
                                {selected?.length ? selected : 'Select repository'}
                            </div>

                            <Transition
                                show={item.isOpen}
                                enter="transition-transform origin-top duration-200"
                                enterFrom="scale-y-0"
                                enterTo="scale-y-100"
                                leave="transition-transform origin-top duration-200"
                                leaveFrom="scale-y-100"
                                leaveTo="scale-y-0"
                            >
                                <div className="orgitem__repos">
                                    <GithubRepositories
                                        organization={item}
                                        isOpen={item.isOpen}
                                        signoutOAuth={signoutOAuth}
                                    />
                                </div>
                            </Transition>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default GithubOrganizations

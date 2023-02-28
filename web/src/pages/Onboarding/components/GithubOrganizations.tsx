import { faRotateRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Transition } from '@headlessui/react'
import { useCallback, useEffect } from 'react'
import { classNames } from 'react-gosh'
import { useRecoilState, useRecoilValue } from 'recoil'
import Spinner from '../../../components/Spinner'
import {
    daoInvitesSelector,
    OAuthSessionAtom,
    octokitSelector,
    onboardingDataAtom,
    organizationsSelector,
    repositoriesCheckedSelector,
} from '../../../store/onboarding.state'
import ListEmpty from './ListEmpty'
import GithubRepositories from './GithubRepositories'
import OAuthProfile from './OAuthProfile'
import PreviousStep from './PreviousStep'
import { Checkbox } from '../../../components/Form'

type TGithubOrganizationsProps = {
    signoutOAuth(): Promise<void>
}

const GithubOrganizations = (props: TGithubOrganizationsProps) => {
    const { signoutOAuth } = props
    const { session } = useRecoilValue(OAuthSessionAtom)
    const [{ isEmailPublic }, setOnboarding] = useRecoilState(onboardingDataAtom)
    const [organizations, setOrganizations] = useRecoilState(organizationsSelector)
    const { items: invites } = useRecoilValue(daoInvitesSelector)
    const octokit = useRecoilValue(octokitSelector)
    const repositoriesChecked = useRecoilValue(repositoriesCheckedSelector)

    const onPublicEmailChange = () => {
        setOnboarding((state) => ({ ...state, isEmailPublic: !state.isEmailPublic }))
    }

    const onOrganizationClick = (id: number | string) => {
        setOrganizations((state) => ({
            ...state,
            items: state.items.map((item) => {
                return item.id === id ? { ...item, isOpen: !item.isOpen } : item
            }),
        }))
    }

    const onBackClick = () => {
        setOnboarding((state) => ({ ...state, step: 'invites' }))
    }

    const onContinueClick = () => {
        setOnboarding((state) => ({ ...state, step: 'phrase' }))
    }

    const getOrganizations = useCallback(async () => {
        if (!octokit || !session) {
            return
        }

        setOrganizations((state) => ({ ...state, isFetching: true }))
        try {
            const { data } = await octokit.request('GET /user/orgs{?per_page,page}', {})
            const combined = [
                {
                    id: session.user.id,
                    name: session.user.user_metadata.user_name,
                    avatar: session.user.user_metadata.avatar_url,
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
                    console.debug('ISOPEN', isOpen)
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
        } catch (e: any) {
            console.error(e.message)
            await signoutOAuth()
            return
        }
    }, [octokit, session, setOrganizations, signoutOAuth])

    useEffect(() => {
        getOrganizations()
    }, [])

    if (!session) {
        return null
    }
    return (
        <div className="signup signup--organizations">
            <div className="signup__aside signup__aside--step aside-step">
                <div className="aside-step__header">
                    {!invites.length ? (
                        <OAuthProfile onSignout={signoutOAuth} />
                    ) : (
                        <PreviousStep onClick={onBackClick} />
                    )}
                </div>

                <p className="aside-step__text">
                    Select GitHub organization to
                    <span className="aside-step__text-blue">
                        &nbsp;create your DAO on GOSH
                    </span>
                </p>

                <div className="mt-8">
                    <label className="flex flex-nowrap items-center gap-x-3">
                        <div>
                            <Checkbox
                                checked={isEmailPublic}
                                onChange={onPublicEmailChange}
                                label={
                                    <div className="text-sm leading-normal">
                                        Enable other GOSH users to find me by email{' '}
                                        {session?.user.email} (optional)
                                    </div>
                                }
                            />
                        </div>
                    </label>
                </div>

                <button
                    type="button"
                    className="aside-step__btn-upload"
                    onClick={onContinueClick}
                    disabled={!repositoriesChecked.length}
                >
                    Upload
                </button>

                {!repositoriesChecked.length &&
                    !!invites.filter((i) => i.accepted === true).length && (
                        <div className="text-center mt-4">
                            <button
                                type="button"
                                className="btn text-gray-53596d hover:text-black"
                                onClick={onContinueClick}
                            >
                                Skip this step
                            </button>
                        </div>
                    )}
            </div>
            <div className="signup__content">
                <div className="signup__reload-items">
                    <button
                        type="button"
                        disabled={organizations.isFetching}
                        onClick={getOrganizations}
                    >
                        {organizations.isFetching ? (
                            <Spinner size="xs" className="icon" />
                        ) : (
                            <FontAwesomeIcon icon={faRotateRight} className="icon" />
                        )}
                        Refresh
                    </button>
                </div>

                {!organizations.isFetching && !organizations.items.length && (
                    <ListEmpty>
                        You should have at least one organization on GitHub
                    </ListEmpty>
                )}

                {organizations.items.map((item, index) => {
                    const selected = item.repositories.items
                        .filter((r) => r.isSelected)
                        .map((r, index) => (
                            <span key={index} className="orgitem__repo">
                                {r.name}
                            </span>
                        ))

                    return (
                        <div key={index} className="signup__orgitem orgitem">
                            <div
                                className="orgitem__main"
                                onClick={() => {
                                    onOrganizationClick(item.id)
                                }}
                            >
                                <div className="orgitem__media">
                                    <img src={item.avatar} alt="Avatar" />
                                </div>
                                <div className="orgitem__content">
                                    <div className="orgitem__header">
                                        <div className="orgitem__title">{item.name}</div>
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

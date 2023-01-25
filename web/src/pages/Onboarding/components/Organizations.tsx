import { faArrowRightFromBracket, faRotateRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Transition } from '@headlessui/react'
import { useCallback, useEffect } from 'react'
import { classNames } from 'react-gosh'
import { useRecoilState, useRecoilValue } from 'recoil'
import Spinner from '../../../components/Spinner'
import {
    OAuthSessionAtom,
    octokitSelector,
    onboardingDataAtom,
    organizationsSelector,
    repositoriesCheckedSelector,
} from '../../../store/onboarding.state'
import ListEmpty from './ListEmpty'
import Repositories from './Repositories'

type TOrganizationsProps = {
    signoutOAuth(): Promise<void>
}

const Organizations = (props: TOrganizationsProps) => {
    const { signoutOAuth } = props
    const { session } = useRecoilValue(OAuthSessionAtom)
    const [{ isEmailPublic }, setOnboarding] = useRecoilState(onboardingDataAtom)
    const [organizations, setOrganizations] = useRecoilState(organizationsSelector)
    const octokit = useRecoilValue(octokitSelector)
    const repositoriesChecked = useRecoilValue(repositoriesCheckedSelector)

    const onPublicEmailChange = () => {
        setOnboarding((state) => ({ ...state, isPublicEmail: !state.isEmailPublic }))
    }

    const onOrganizationClick = (id: number | string) => {
        setOrganizations((state) => ({
            ...state,
            items: state.items.map((item) => {
                return item.id === id ? { ...item, isOpen: !item.isOpen } : item
            }),
        }))
    }

    const onContinueClick = () => {
        setOnboarding((state) => ({ ...state, step: 'phrase' }))
    }

    const getOrganizations = useCallback(async () => {
        if (!octokit || !session) return

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
                items: combined.map((item: any) => {
                    const found = state.items.find((i) => i.id === item.id)
                    if (found) {
                        return { ...found, ...item }
                    }
                    return { ...item, repositories: { items: [], isFetching: false } }
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

                <div className="mt-8">
                    <label className="flex flex-nowrap items-center gap-x-3">
                        <div>
                            <input
                                type="checkbox"
                                checked={isEmailPublic}
                                onChange={onPublicEmailChange}
                            />
                        </div>
                        <div className="text-sm leading-normal">
                            Enable other GOSH users to find me by email{' '}
                            {session?.user.email} (optional)
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
                    <ListEmpty />
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
                                    <Repositories
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

export default Organizations

import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link, useLocation } from 'react-router-dom'
import { useSetRecoilState } from 'recoil'
import { Button } from '../../../components/Form'
import Skeleton from '../../../components/Skeleton'
import { getIdenticonAvatar } from '../../../helpers'
import { appModalStateAtom } from '../../../store/app.state'
import { useHackathon, useSubmitHackathonApps } from '../../hooks/hackathon.hooks'
import { useUser } from '../../hooks/user.hooks'
import { HackathonParticipantsModal } from './ParticipantsModal'

const SkeletonParticipants = () => {
    return (
        <Skeleton skeleton={{ height: 40 }}>
            <rect x="0" y="0" rx="4" ry="4" width="100%" height="10" />
            <rect x="0" y="15" rx="4" ry="4" width="100%" height="10" />
            <rect x="0" y="30" rx="4" ry="4" width="100%" height="10" />
        </Skeleton>
    )
}

const HackathonParticipantsOverview = () => {
    const setModal = useSetRecoilState(appModalStateAtom)
    const location = useLocation()
    const { user } = useUser()
    const { hackathon } = useHackathon()
    const { submitApps } = useSubmitHackathonApps()

    const show_skeleton =
        !hackathon?.apps_submitted.is_fetched && hackathon?.apps_submitted.is_fetching

    const onSubmitAppModal = () => {
        setModal({
            static: true,
            isOpen: true,
            element: <HackathonParticipantsModal onSubmit={onSubmitApp} />,
        })
    }

    const onSubmitApp = async (values: { dao_name: string; repo_name: string }[]) => {
        try {
            await submitApps({ items: values })
            setModal((state) => ({ ...state, isOpen: false }))
        } catch (e: any) {
            console.error(e.message)
        }
    }

    if (!user.keys) {
        return (
            <div className="py-5 text-sm text-gray-53596d text-center">
                <Link
                    to={`/a/signin?redirect_to=${location.pathname}`}
                    className="underline"
                >
                    Sign in
                </Link>{' '}
                <span>to add your applications</span>
            </div>
        )
    }

    if (!hackathon) {
        return null
    }

    return (
        <div className="py-5">
            <h3 className="mb-2.5 text-sm font-medium">Your applications</h3>

            <div className="flex flex-col gap-2">
                {show_skeleton && <SkeletonParticipants />}

                {!show_skeleton && !hackathon.apps_submitted.items.length && (
                    <div className="text-sm text-gray-7c8db5">
                        There are no participants where you are a member of
                    </div>
                )}

                {hackathon.apps_submitted.items
                    .filter(({ is_member }) => !!is_member)
                    .map(({ dao_name, repo_name }, index) => (
                        <div
                            key={index}
                            className="flex flex-nowrap items-center gap-x-2.5"
                        >
                            <div className="w-8">
                                <img
                                    src={getIdenticonAvatar({
                                        seed: dao_name,
                                        radius: 50,
                                    }).toDataUriSync()}
                                    alt=""
                                    className="w-full"
                                />
                            </div>
                            <div className="text-sm">
                                <span>{dao_name}</span>
                                <span className="mx-1">/</span>
                                <Link
                                    to={`/o/${dao_name}/r/${repo_name}`}
                                    target="_blank"
                                    className="text-blue-2b89ff"
                                >
                                    {repo_name}
                                </Link>
                            </div>
                        </div>
                    ))}
            </div>

            {!show_skeleton &&
                !hackathon.is_participate_enabled &&
                !hackathon.is_voting_started && (
                    <div className="mt-4 text-sm text-gray-7c8db5">
                        Applications submitting will be available after hackathon starts
                    </div>
                )}

            {!show_skeleton && hackathon.is_participate_enabled && hackathon._rg_fetched && (
                <div className="mt-4">
                    <Button
                        variant="custom"
                        size="sm"
                        className="border !border-blue-2b89ff text-blue-2b89ff !rounded-[2rem]"
                        onClick={onSubmitAppModal}
                    >
                        <FontAwesomeIcon icon={faPlus} className="mr-2" />
                        Add application
                    </Button>
                </div>
            )}
        </div>
    )
}

export { HackathonParticipantsOverview }

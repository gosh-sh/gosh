import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link, useLocation } from 'react-router-dom'
import { useSetRecoilState } from 'recoil'
import { Button } from '../../../components/Form'
import { getIdenticonAvatar } from '../../../helpers'
import { appModalStateAtom } from '../../../store/app.state'
import { useAddHackatonParticipants, useHackaton } from '../../hooks/hackaton.hooks'
import { useUser } from '../../hooks/user.hooks'
import { HackatonParticipantsModal } from './ParticipantsModal'

const HackatonParticipantsOverview = () => {
    const setModal = useSetRecoilState(appModalStateAtom)
    const location = useLocation()
    const { user } = useUser()
    const hackaton = useHackaton()
    const { addParticipants } = useAddHackatonParticipants()

    const onAddParticipantsModal = () => {
        setModal({
            static: false,
            isOpen: true,
            element: <HackatonParticipantsModal onSubmit={onAddParticipantsSubmit} />,
        })
    }

    const onAddParticipantsSubmit = async (
        values: { dao_name: string; repo_name: string }[],
    ) => {
        try {
            await addParticipants({ items: values })
            setModal((state) => ({ ...state, isOpen: false }))
        } catch (e: any) {
            console.error(e.message)
        }
    }

    if (!user.keys) {
        console.debug('L', location)
        return (
            <div className="py-5 text-sm text-gray-53596d text-center">
                <Link to="/a/signin?redirect=" className="underline">
                    Sign in
                </Link>{' '}
                <span>to add your applications</span>
            </div>
        )
    }

    return (
        <div className="py-5">
            <h3 className="mb-2.5 text-sm font-medium">Your applications</h3>
            <div className="flex flex-col gap-2">
                {!hackaton.data?.participants.length && (
                    <div>There are no participants where you are member of</div>
                )}

                {hackaton.data?.participants
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
                                    className="text-blue-2b89ff"
                                >
                                    {repo_name}
                                </Link>
                            </div>
                        </div>
                    ))}
            </div>
            <div className="mt-4">
                <Button
                    variant="custom"
                    size="sm"
                    className="border !border-blue-2b89ff text-blue-2b89ff !rounded-[2rem]"
                    onClick={onAddParticipantsModal}
                >
                    <FontAwesomeIcon icon={faPlus} className="mr-2" />
                    Add application
                </Button>
            </div>
        </div>
    )
}

export { HackatonParticipantsOverview }

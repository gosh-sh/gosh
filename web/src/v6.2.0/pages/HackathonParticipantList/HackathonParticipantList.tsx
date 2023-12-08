import { faClock } from '@fortawesome/free-regular-svg-icons'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Form, Formik } from 'formik'
import { ChangeEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input } from '../../../components/Form'
import { HackathonStatus } from '../../components/Hackathon'
import { useDao, useDaoMember } from '../../hooks/dao.hooks'
import { useHackathon, useHackathonVoting } from '../../hooks/hackathon.hooks'
import { ListBoundary } from './components'

const HackathonParticipantListPage = () => {
    const navigate = useNavigate()
    const dao = useDao()
    const member = useDaoMember()
    const { hackathon } = useHackathon()
    const { checked_apps, approveApps, voteForApps } = useHackathonVoting()
    const [search, setSearch] = useState<string>('')

    const onSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value)
    }

    const onApproveApps = async () => {
        try {
            const { event_address } = await approveApps()
            if (event_address) {
                navigate(`/o/${dao.details.name}/events/${event_address}`)
            }
        } catch (e: any) {
            console.error(e.message)
        }
    }

    const onVoteForApps = async () => {
        try {
            await voteForApps()
        } catch (e: any) {
            console.error(e.message)
        }
    }

    return (
        <div className="row flex-wrap lg:flex-nowrap">
            <div className="col !basis-full lg:!basis-8/12 xl:!basis-9/12">
                <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
                    <Input
                        className="grow"
                        type="search"
                        placeholder="Search participant"
                        autoComplete="off"
                        before={
                            <FontAwesomeIcon
                                icon={faMagnifyingGlass}
                                className="text-gray-7c8db5 font-extralight py-3 pl-4"
                            />
                        }
                        value={search}
                        onChange={onSearchChange}
                    />
                </div>
                <ListBoundary search={search} />
            </div>

            <div className="col !basis-full lg:!basis-4/12 xl:!basis-4/12 md:grow-0">
                <div className="flex flex-col gap-y-5">
                    {member.isMember &&
                        hackathon?.is_voting_started &&
                        !hackathon?.is_voting_created && (
                            <div className="border border-gray-e6edff rounded-xl overflow-hidden px-5">
                                <div
                                    className="py-4 w-full flex items-center justify-between
                                border-b border-b-gray-e6edff text-xl font-medium"
                                >
                                    <div className="grow">Selected applications</div>
                                    <div>{checked_apps.length}</div>
                                </div>

                                <div className="py-5">
                                    <Formik initialValues={{}} onSubmit={onApproveApps}>
                                        {({ isSubmitting }) => (
                                            <Form>
                                                <Button
                                                    type="submit"
                                                    className="w-full"
                                                    disabled={
                                                        isSubmitting ||
                                                        checked_apps.length === 0
                                                    }
                                                    isLoading={isSubmitting}
                                                >
                                                    Create proposal to start voting
                                                </Button>
                                            </Form>
                                        )}
                                    </Formik>
                                </div>
                            </div>
                        )}

                    {member.isMember && hackathon?.is_voting_created && (
                        <div className="border border-gray-e6edff rounded-xl overflow-hidden px-5">
                            <div className="py-4 w-full border-b border-b-gray-e6edff">
                                <div className="flex items-center justify-between text-xl font-medium">
                                    <div className="grow">Left to vote</div>
                                    <div>
                                        {hackathon.member_voting_state?.karma_rest_dirty.toLocaleString()}
                                    </div>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-gray-7c8db5">
                                    <div className="grow">total karma</div>
                                    <div>{member.allowance?.toLocaleString()}</div>
                                </div>
                            </div>

                            {!hackathon.is_voting_finished && (
                                <div className="mt-5">
                                    <Formik initialValues={{}} onSubmit={onVoteForApps}>
                                        {({ isSubmitting }) => (
                                            <Form>
                                                <Button
                                                    type="submit"
                                                    className="w-full"
                                                    disabled={
                                                        isSubmitting ||
                                                        hackathon.member_voting_state
                                                            ?.karma_rest === 0
                                                    }
                                                    isLoading={isSubmitting}
                                                >
                                                    Send votes
                                                </Button>
                                            </Form>
                                        )}
                                    </Formik>
                                </div>
                            )}

                            <div className="my-4 flex items-center justify-between gap-6">
                                <div className="flex flex-wrap items-center justify-between gap-6">
                                    <div
                                        className="px-3 py-1.5 border border-[#2B89FF]/25 rounded-2xl
                                        bg-[#2B89FF]/15 text-blue-2b89ff font-medium text-sm"
                                    >
                                        <FontAwesomeIcon
                                            icon={faClock}
                                            className="mr-2.5"
                                        />
                                        <HackathonStatus
                                            dates={hackathon!.metadata.dates}
                                        />
                                    </div>
                                    <div className="grow text-sm md:text-end">
                                        {hackathon?.apps_submitted.items.length.toLocaleString()}{' '}
                                        Participants
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default HackathonParticipantListPage

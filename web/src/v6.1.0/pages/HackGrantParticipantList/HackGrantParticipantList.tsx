import { Button, Input } from '../../../components/Form'
import { ListBoundary } from './components'
import { useDaoRepositoryList } from '../../hooks/repository.hooks'
import Loader from '../../../components/Loader'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import classNames from 'classnames'
import { faClock } from '@fortawesome/free-regular-svg-icons'

const HackGrantParticipantListPage = (props: { count?: number }) => {
    const { count = 10 } = props
    const repositories = useDaoRepositoryList({ initialize: true, count })

    return (
        <div className="row flex-wrap">
            <div className="col !basis-full lg:!basis-7/12">
                <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
                    <Input
                        className="grow"
                        type="search"
                        placeholder="Search participant (disabled)"
                        autoComplete="off"
                        disabled
                        before={
                            <FontAwesomeIcon
                                icon={faMagnifyingGlass}
                                className="text-gray-7c8db5 font-extralight py-3 pl-4"
                            />
                        }
                    />
                </div>

                <Loader
                    className={classNames(
                        'text-xs text-right mb-2',
                        repositories.isFetching ? 'visible' : 'invisible',
                    )}
                >
                    Updating
                </Loader>
                <ListBoundary count={count} />
            </div>

            <div className="col !basis-full lg:!basis-3/12">
                <div className="flex flex-col gap-y-5">
                    <div className="border border-gray-e6edff rounded-xl overflow-hidden px-5">
                        <div
                            className="py-4 w-full flex items-center justify-between
                                border-b border-b-gray-e6edff text-xl font-medium"
                        >
                            <div className="grow">Selected applications</div>
                            <div>5</div>
                        </div>
                        <div className="py-5">
                            <Button className="w-full">
                                Create proposal to remove selected
                            </Button>
                        </div>

                        <div className="mb-4 flex items-center justify-between gap-6">
                            <div className="py-1.5 text-blue-2b89ff text-xs whitespace-nowrap">
                                <FontAwesomeIcon icon={faClock} className="mr-2.5" />
                                Ongoing 1 day 14 hours left
                            </div>
                            <div className="grow text-blue-2b89ff font-medium text-end whitespace-nowrap">
                                16 Participants
                            </div>
                        </div>
                    </div>

                    <div className="border border-gray-e6edff rounded-xl overflow-hidden px-5">
                        <div className="py-4 w-full border-b border-b-gray-e6edff">
                            <div className="flex items-center justify-between text-xl font-medium">
                                <div className="grow">Left to vote</div>
                                <div>1,200</div>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-gray-7c8db5">
                                <div className="grow">total karma</div>
                                <div>5,200</div>
                            </div>
                        </div>
                        <div className="py-5">
                            <Button className="w-full">Send vote</Button>
                        </div>

                        <div className="mb-4 flex items-center justify-between gap-6">
                            <div className="py-1.5 text-blue-2b89ff text-xs whitespace-nowrap">
                                <FontAwesomeIcon icon={faClock} className="mr-2.5" />
                                Ongoing 1 day 14 hours left
                            </div>
                            <div className="grow text-blue-2b89ff font-medium text-end whitespace-nowrap">
                                16 Participants
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default HackGrantParticipantListPage

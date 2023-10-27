import { faList, faPencil, faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button, Textarea } from '../../../components/Form'
import { faCalendarAlt, faClock } from '@fortawesome/free-regular-svg-icons'
import { useSetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../../store/app.state'
import { DatePickerModal, PrizePoolModal } from './components'

const HackGrantCreatePage = () => {
    const setModal = useSetRecoilState(appModalStateAtom)

    const onSetPrizePoolClick = () => {
        setModal({
            static: false,
            isOpen: true,
            element: <PrizePoolModal />,
        })
    }

    const onSetDateClick = () => {
        setModal({
            static: false,
            isOpen: true,
            element: <DatePickerModal />,
        })
    }

    return (
        <div className="row flex-wrap">
            <div className="col !basis-full lg:!basis-7/12">
                <div className="border border-gray-e6edff rounded-xl overflow-hidden">
                    <div className="p-5 border-b border-b-gray-e6edff">
                        <FontAwesomeIcon
                            icon={faList}
                            size="xs"
                            className="mr-4 text-gray-7c8db5"
                        />
                        <span className="text-blue-2b89ff font-medium">README.md</span>
                    </div>
                    <div className="p-5">content</div>
                </div>

                <div className="mt-14 border border-gray-e6edff rounded-xl overflow-hidden">
                    <div className="p-5 border-b border-b-gray-e6edff">
                        <FontAwesomeIcon
                            icon={faList}
                            size="xs"
                            className="mr-4 text-gray-7c8db5"
                        />
                        <span className="text-blue-2b89ff font-medium">RULES.md</span>
                    </div>
                    <div className="p-5">content</div>
                </div>
            </div>
            <div className="col !basis-full lg:!basis-5/12">
                <div className="flex flex-col gap-y-5">
                    <div className="border border-gray-e6edff rounded-xl overflow-hidden px-5">
                        <div className="border-b border-b-gray-e6edff overflow-hidden">
                            <div className="py-4 flex items-center justify-between">
                                <div className="text-xl font-medium">Prize pool</div>
                                <Button
                                    variant="custom"
                                    size="sm"
                                    className="block border !border-blue-2b89ff text-blue-2b89ff !rounded-[2rem]"
                                    onClick={onSetPrizePoolClick}
                                >
                                    Add prize pool
                                    <FontAwesomeIcon icon={faPlus} className="ml-2" />
                                </Button>
                            </div>
                        </div>

                        <div className="py-4 border-b border-b-gray-e6edff flex flex-col gap-y-4">
                            <div className="flex items-center justify-between">
                                <div className="font-medium">Start date</div>
                                <Button
                                    variant="custom"
                                    size="sm"
                                    className="block border !border-blue-2b89ff text-blue-2b89ff !rounded-[2rem]"
                                    onClick={onSetDateClick}
                                >
                                    Add date
                                    <FontAwesomeIcon
                                        icon={faCalendarAlt}
                                        className="ml-2"
                                    />
                                </Button>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="font-medium">Voting date</div>
                                <Button
                                    variant="custom"
                                    size="sm"
                                    className="block border !border-blue-2b89ff text-blue-2b89ff !rounded-[2rem]"
                                    onClick={onSetDateClick}
                                >
                                    Add date
                                    <FontAwesomeIcon
                                        icon={faCalendarAlt}
                                        className="ml-2"
                                    />
                                </Button>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="font-medium">Finish date</div>
                                <Button
                                    variant="custom"
                                    size="sm"
                                    className="block border !border-blue-2b89ff text-blue-2b89ff !rounded-[2rem]"
                                    onClick={onSetDateClick}
                                >
                                    Add date
                                    <FontAwesomeIcon
                                        icon={faCalendarAlt}
                                        className="ml-2"
                                    />
                                </Button>
                            </div>
                        </div>

                        <div className="py-5">
                            <Button className="w-full">Create proposal to publich</Button>
                        </div>
                    </div>

                    <div>
                        <div className="mb-4 text-lg font-medium">Short description</div>
                        <Textarea
                            minRows={5}
                            maxRows={10}
                            placeholder="Put short description here"
                        />
                    </div>

                    <div>
                        <div className="pb-5 flex items-center gap-2">
                            <div className="text-lg font-medium">0 Experts in</div>
                            <div className="grow flex items-center gap-2">
                                <Button
                                    variant="custom"
                                    size="sm"
                                    className="block border !border-blue-2b89ff text-blue-2b89ff !rounded-[2rem]"
                                >
                                    Add tag
                                    <FontAwesomeIcon icon={faPlus} className="ml-2" />
                                </Button>
                            </div>
                        </div>
                        <div className="border border-gray-e6edff rounded-xl overflow-hidden px-5">
                            <div
                                className="py-4 w-full flex items-center justify-between
                                border-b border-b-gray-e6edff"
                            >
                                <div className="font-medium">Top 5 by total karma</div>
                            </div>

                            <div className="py-5 divide-y divide-gray-e6edff">
                                <p className="text-center">
                                    Add tags to see experts here
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default HackGrantCreatePage

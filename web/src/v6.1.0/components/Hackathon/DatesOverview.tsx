import {
    IconDefinition,
    faCalendarAlt,
    faClock,
    faHand,
} from '@fortawesome/free-regular-svg-icons'
import { faFlagCheckered } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import moment from 'moment'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSetRecoilState } from 'recoil'
import { Button } from '../../../components/Form'
import Skeleton from '../../../components/Skeleton'
import { GoshError } from '../../../errors'
import { appModalStateAtom } from '../../../store/app.state'
import { useDao, useDaoMember } from '../../hooks/dao.hooks'
import { useHackathon, useUpdateHackathonDetails } from '../../hooks/hackathon.hooks'
import { HackathonDatesModal } from './DatesModal'
import { HackathonStatus } from './Status'

type TDateState = {
    key: string
    title: string
    icon: IconDefinition
    time: number
}

const dates_data: { [k: string]: { title: string; icon: IconDefinition } } = {
    start: { title: 'Start', icon: faClock },
    voting: { title: 'Voting', icon: faHand },
    finish: { title: 'Finish', icon: faFlagCheckered },
}

const SkeletonOverview = () => {
    return (
        <Skeleton skeleton={{ height: 48 }} className="py-5">
            <rect x="0" y="0" rx="4" ry="4" width="100%" height="12" />
            <rect x="0" y="18" rx="4" ry="4" width="100%" height="12" />
            <rect x="0" y="36" rx="4" ry="4" width="100%" height="12" />
        </Skeleton>
    )
}

const HackathonDatesOverview = () => {
    const navigate = useNavigate()
    const setModal = useSetRecoilState(appModalStateAtom)
    const dao = useDao()
    const member = useDaoMember()
    const { hackathon } = useHackathon()
    const { update } = useUpdateHackathonDetails()
    const [dates, setDates] = useState<TDateState[]>([])

    const onUpdateDatesModal = (tab_index?: number) => {
        setModal({
            static: true,
            isOpen: true,
            element: (
                <HackathonDatesModal
                    initial_values={{
                        start: 0,
                        voting: 0,
                        finish: 0,
                        ...hackathon?.metadata.dates,
                    }}
                    tab_index={tab_index}
                    onSubmit={onUpdateDatesSubmit}
                />
            ),
        })
    }

    const onUpdateDatesSubmit = async (values: { [k: string]: number }) => {
        try {
            if (!hackathon?.metadata.raw) {
                throw new GoshError('Value error', 'Hackathon metadata is not loaded yet')
            }

            const original = JSON.parse(hackathon.metadata.raw)
            const modified = { ...original, dates: values }
            const { event_address } = await update({
                repo_name: hackathon.name,
                filename: 'metadata.json',
                content: {
                    original: hackathon.metadata.raw,
                    modified: JSON.stringify(modified, undefined, 2),
                },
            })
            setModal((state) => ({ ...state, isOpen: false }))
            if (event_address) {
                navigate(`/o/${dao.details.name}/events/${event_address}`)
            }
        } catch (e: any) {
            console.error(e.message)
        }
    }

    useEffect(() => {
        if (hackathon?.metadata.dates) {
            const casted: { [k: string]: number } = { ...hackathon.metadata.dates }
            const listed = Object.keys(casted).map((key) => ({
                key,
                title: dates_data[key].title,
                icon: dates_data[key].icon,
                time: casted[key],
            }))
            setDates(listed)
        }
    }, [hackathon?.metadata.is_fetching])

    if (
        !hackathon?._rg_fetched ||
        (!hackathon?.metadata.is_fetched && hackathon?.metadata.is_fetching)
    ) {
        return <SkeletonOverview />
    }

    return (
        <div>
            <div className="py-5 border-b border-b-gray-e6edff">
                <div className="flex flex-wrap items-center justify-between gap-6">
                    <div
                        className="px-3 py-1.5 border border-[#2B89FF]/25 rounded-2xl
                        bg-[#2B89FF]/15 text-blue-2b89ff font-medium text-sm"
                    >
                        <FontAwesomeIcon icon={faClock} className="mr-2.5" />
                        <HackathonStatus dates={hackathon.metadata.dates} />
                    </div>
                    <div className="grow text-sm md:text-end">
                        {hackathon?.participants.items.length.toLocaleString()}{' '}
                        Participants
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-y-4 py-5 border-b border-b-gray-e6edff">
                {dates.map(({ key, title, icon, time }, index) => (
                    <div key={key} className="flex items-center justify-between gap-x-5">
                        <div className="grow font-medium whitespace-nowrap">
                            <FontAwesomeIcon icon={icon} fixedWidth className="mr-2" />
                            {title}
                        </div>
                        <div className="flex items-center justify-end gap-x-3">
                            {time > 0 && (
                                <div className="text-xs">
                                    {moment.unix(time).format('MMM D, YYYY HH:mm:ss')}
                                </div>
                            )}

                            {member.isMember && hackathon.update_enabled && (
                                <Button
                                    type="button"
                                    variant="custom"
                                    size="sm"
                                    className="block border !border-blue-2b89ff text-blue-2b89ff !rounded-[2rem]"
                                    onClick={() => onUpdateDatesModal(index)}
                                >
                                    {time > 0 ? 'Edit' : 'Add date'}
                                    <FontAwesomeIcon
                                        icon={faCalendarAlt}
                                        className="ml-2"
                                    />
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export { HackathonDatesOverview }

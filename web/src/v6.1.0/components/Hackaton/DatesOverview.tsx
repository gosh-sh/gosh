import { faCalendarAlt, faClock } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import moment from 'moment'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSetRecoilState } from 'recoil'
import { Button } from '../../../components/Form'
import { GoshError } from '../../../errors'
import { appModalStateAtom } from '../../../store/app.state'
import { useDao, useDaoMember } from '../../hooks/dao.hooks'
import { useHackaton, useUpdateHackatonDetails } from '../../hooks/hackaton.hooks'
import { HackatonDatesModal } from './DatesModal'

const titles: { [k: string]: string } = {
    start: 'Start',
    voting: 'Voting',
    finish: 'Finish',
}

const HackatonDatesOverview = () => {
    const navigate = useNavigate()
    const setModal = useSetRecoilState(appModalStateAtom)
    const dao = useDao()
    const member = useDaoMember()
    const { data } = useHackaton()
    const { update } = useUpdateHackatonDetails()
    const [dates, setDates] = useState<{ key: string; title: string; time: number }[]>([])

    const onUpdateDatesModal = (tab_index?: number) => {
        setModal({
            static: false,
            isOpen: true,
            element: (
                <HackatonDatesModal
                    initial_values={{
                        start: 0,
                        voting: 0,
                        finish: 0,
                        ...data?.metadata.dates,
                    }}
                    tab_index={tab_index}
                    onSubmit={onUpdateDatesSubmit}
                />
            ),
        })
    }

    const onUpdateDatesSubmit = async (values: { [k: string]: number }) => {
        try {
            if (!data?.metadata.raw) {
                throw new GoshError('Value error', 'Hackaton metadata is not loaded yet')
            }

            const original = JSON.parse(data.metadata.raw)
            const modified = { ...original, dates: values }
            const { event_address } = await update({
                repo_name: data.name,
                filename: 'metadata.json',
                content: {
                    original: data.metadata.raw,
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
        if (data?.metadata.dates) {
            const casted: { [k: string]: number } = { ...data.metadata.dates }
            const listed = Object.keys(casted).map((key) => ({
                key,
                title: titles[key],
                time: casted[key],
            }))
            setDates(listed)
        }
    }, [data?.metadata.is_fetching])

    return (
        <div>
            <div className="py-5 border-b border-b-gray-e6edff">
                <div className="flex items-center justify-between gap-6">
                    <div
                        className="px-3 py-1.5 border border-[#2B89FF]/25 rounded-2xl
                        bg-[#2B89FF]/15 text-blue-2b89ff font-medium text-sm"
                    >
                        <FontAwesomeIcon icon={faClock} className="mr-2.5" />
                        Ongoing 1 day 14 hours left
                    </div>
                    <div className="grow text-sm text-end">
                        {data?.participants.length.toLocaleString()} Participants
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-y-4 py-5 border-b border-b-gray-e6edff">
                {dates.map(({ key, title, time }, index) => (
                    <div key={key} className="flex items-center justify-between gap-x-5">
                        <div className="grow font-medium">{title}</div>
                        <div className="flex items-center justify-end gap-x-3">
                            {time > 0 && (
                                <div className="text-xs">
                                    {moment.unix(time).format('MMM D, YYYY HH:mm:ss')}
                                </div>
                            )}

                            {member.isMember && (
                                <Button
                                    type="button"
                                    variant="custom"
                                    size="sm"
                                    className="block border !border-blue-2b89ff text-blue-2b89ff !rounded-[2rem]"
                                    onClick={() => onUpdateDatesModal(index)}
                                >
                                    {time > 0 ? 'Change date' : 'Add date'}
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

export { HackatonDatesOverview }

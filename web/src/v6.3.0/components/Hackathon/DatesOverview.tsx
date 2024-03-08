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
import { Tooltip } from 'react-tooltip'
import { useSetRecoilState } from 'recoil'
import { Button } from '../../../components/Form'
import { appModalStateAtom } from '../../../store/app.state'
import { useDao, useDaoMember } from '../../hooks/dao.hooks'
import { useHackathon, useUpdateHackathon } from '../../hooks/hackathon.hooks'
import { THackathonDates } from '../../types/hackathon.types'
import { HackathonDatesModal } from './DatesModal'
import { HackathonStatus } from './Status'

type TDateState = {
  key: string
  title: string
  icon: IconDefinition
  time: number
  hint?: string
}

const dates_data: {
  [k: string]: { title: string; icon: IconDefinition; hint?: string }
} = {
  start: { title: 'Start', icon: faClock, hint: 'Time and day your program starts' },
  voting: { title: 'Voting', icon: faHand, hint: 'Time and day when voting begins' },
  finish: {
    title: 'Finish',
    icon: faFlagCheckered,
    hint: 'Time and day when winners are revealed',
  },
}

const HackathonDatesOverview = () => {
  const navigate = useNavigate()
  const setModal = useSetRecoilState(appModalStateAtom)
  const dao = useDao()
  const member = useDaoMember()
  const { hackathon } = useHackathon()
  const { updateMetadata } = useUpdateHackathon()
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
      const { event_address } = await updateMetadata({
        dates: values as THackathonDates,
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
        hint: dates_data[key].hint,
      }))
      setDates(listed)
    }
  }, [hackathon?.metadata.dates])

  if (!hackathon) {
    return null
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
            {hackathon?.apps_submitted.items.length.toLocaleString()} Participants
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-y-4 py-5 border-b border-b-gray-e6edff">
        {dates.map(({ key, title, icon, time, hint }, index) => (
          <div key={key} className="flex items-center justify-between gap-x-5">
            <div
              className="grow font-medium whitespace-nowrap"
              data-tooltip-id="common-tip"
              data-tooltip-content={hint}
            >
              <FontAwesomeIcon icon={icon} fixedWidth className="mr-2" />
              {title}
            </div>
            <div className="flex items-center justify-end gap-x-3">
              {time > 0 && (
                <div className="text-xs">
                  {moment.unix(time).format('MMM D, YYYY HH:mm:ss')}
                </div>
              )}

              {member.isMember && hackathon.is_update_enabled && (
                <Button
                  type="button"
                  variant="custom"
                  size="sm"
                  className="block border !border-blue-2b89ff text-blue-2b89ff !rounded-[2rem]
                                    opacity-70 hover:opacity-100 disabled:opacity-30 transition-opacity duration-200"
                  onClick={() => onUpdateDatesModal(index)}
                >
                  {time > 0 ? 'Edit' : 'Add date'}
                  <FontAwesomeIcon icon={faCalendarAlt} className="ml-2" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Tooltip id="common-tip" positionStrategy="fixed" className="z-10" />
    </div>
  )
}

export { HackathonDatesOverview }
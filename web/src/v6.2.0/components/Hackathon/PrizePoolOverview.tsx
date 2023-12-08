import { faChevronDown, faPencil } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import classNames from 'classnames'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tooltip } from 'react-tooltip'
import { useSetRecoilState } from 'recoil'
import { Button } from '../../../components/Form'
import Skeleton from '../../../components/Skeleton'
import { GoshError } from '../../../errors'
import { appModalStateAtom } from '../../../store/app.state'
import { useDao, useDaoMember } from '../../hooks/dao.hooks'
import { useHackathon, useUpdateHackathon } from '../../hooks/hackathon.hooks'
import { HackathonPrizePoolModal } from './PrizePoolModal'
import { HackathonPrizePoolPlaces } from './PrizePoolPlaces'

const SkeletonPlaces = () => {
    return (
        <Skeleton skeleton={{ height: 40 }}>
            <rect x="0" y="0" rx="4" ry="4" width="100%" height="10" />
            <rect x="0" y="15" rx="4" ry="4" width="100%" height="10" />
            <rect x="0" y="30" rx="4" ry="4" width="100%" height="10" />
        </Skeleton>
    )
}

const SkeletonTotal = () => {
    return (
        <Skeleton skeleton={{ height: 28, width: 40 }}>
            <rect x="0" y="0" rx="4" ry="4" width="40" height="28" />
        </Skeleton>
    )
}

const HackathonPrizePoolOverview = () => {
    const navigate = useNavigate()
    const setModal = useSetRecoilState(appModalStateAtom)
    const dao = useDao()
    const member = useDaoMember()
    const { hackathon } = useHackathon()
    const { updateStorageData } = useUpdateHackathon()
    const [pool_opened, setPoolOpened] = useState<boolean>(false)

    const is_fetching =
        !hackathon?._rg_fetched ||
        (!hackathon?.storagedata.is_fetched && hackathon?.storagedata.is_fetching)

    const onPoolToggle = () => {
        setPoolOpened(!pool_opened)
    }

    const onUpdatePrizePoolModal = () => {
        if (!hackathon?.storagedata.prize) {
            return
        }

        const initial_values = {
            total: hackathon.storagedata.prize.total.toString(),
            places: hackathon.storagedata.prize.places.map((amount) => amount.toString()),
        }

        setModal({
            static: true,
            isOpen: true,
            element: (
                <HackathonPrizePoolModal
                    initial_values={initial_values}
                    onSubmit={onUpdatePrizePoolSubmit}
                />
            ),
        })
    }

    const onUpdatePrizePoolSubmit = async (values: {
        total: number
        places: number[]
    }) => {
        try {
            if (!hackathon) {
                throw new GoshError('Value error', 'Hackathon data is undefined')
            }

            const original = hackathon.storagedata.prize_raw
            const modified = { ...JSON.parse(original), prize: values }
            const { event_address } = await updateStorageData({
                filename: 'metadata.json',
                content: {
                    original,
                    modified: JSON.stringify(modified),
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

    return (
        <div className="border-b border-b-gray-e6edff overflow-hidden">
            <Button
                variant="custom"
                className="!px-0 !py-4 w-full flex items-center justify-between"
                onClick={onPoolToggle}
            >
                <div
                    className="text-xl font-medium"
                    data-tooltip-id="common-tip"
                    data-tooltip-content="Outline how much winners get rewarded and what for"
                >
                    Prize pool
                </div>

                <div className="text-xl font-medium flex flex-nowrap items-center">
                    {is_fetching ? (
                        <SkeletonTotal />
                    ) : (
                        hackathon?.storagedata.prize?.total.toLocaleString()
                    )}
                    <FontAwesomeIcon
                        icon={faChevronDown}
                        className={classNames(
                            'ml-3 font-normal text-xs transition-transform duration-200',
                            pool_opened ? 'rotate-180' : 'rotate-0',
                        )}
                    />
                </div>
            </Button>
            <AnimatePresence>
                {pool_opened && (
                    <motion.div
                        className="mb-3"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {member.isMember && hackathon?.is_update_enabled && (
                            <Button
                                variant="custom"
                                size="sm"
                                className="block mb-2 ml-auto opacity-70 transition-opacity duration-200
                                hover:opacity-100 disabled:opacity-30"
                                disabled={is_fetching}
                                onClick={onUpdatePrizePoolModal}
                            >
                                <FontAwesomeIcon icon={faPencil} className="mr-2" />
                                Update
                            </Button>
                        )}

                        {is_fetching && <SkeletonPlaces />}

                        <HackathonPrizePoolPlaces
                            places={hackathon?.storagedata.prize.places || []}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <Tooltip id="common-tip" positionStrategy="fixed" className="z-10" />
        </div>
    )
}

export { HackathonPrizePoolOverview }

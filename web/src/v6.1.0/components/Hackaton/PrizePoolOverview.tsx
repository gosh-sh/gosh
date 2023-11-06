import { faChevronDown, faPencil } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import classNames from 'classnames'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSetRecoilState } from 'recoil'
import { Button } from '../../../components/Form'
import { GoshError } from '../../../errors'
import { appModalStateAtom } from '../../../store/app.state'
import { useDao, useDaoMember } from '../../hooks/dao.hooks'
import { useHackaton, useUpdateHackatonDetails } from '../../hooks/hackaton.hooks'
import { HackatonPrizePoolModal } from './PrizePoolModal'
import { HackatonPrizePoolPlaces } from './PrizePoolPlaces'

const HackatonPrizePoolOverview = () => {
    const navigate = useNavigate()
    const setModal = useSetRecoilState(appModalStateAtom)
    const dao = useDao()
    const member = useDaoMember()
    const { data } = useHackaton()
    const { update } = useUpdateHackatonDetails()
    const [pool_opened, setPoolOpened] = useState<boolean>(false)

    const onPoolToggle = () => {
        setPoolOpened(!pool_opened)
    }

    const onUpdatePrizePoolModal = () => {
        if (!data?.metadata.prize) {
            return
        }

        const initial_values = {
            total: data.metadata.prize.total.toString(),
            places: data.metadata.prize.places.map((amount) => amount.toString()),
        }

        setModal({
            static: false,
            isOpen: true,
            element: (
                <HackatonPrizePoolModal
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
            if (!data?.metadata.raw) {
                throw new GoshError('Value error', 'Hackaton metadata is not loaded yet')
            }

            const original = JSON.parse(data.metadata.raw)
            const modified = { ...original, prize: values }
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

    return (
        <div className="border-b border-b-gray-e6edff overflow-hidden">
            <Button
                variant="custom"
                className="!px-0 !py-4 w-full flex items-center justify-between"
                onClick={onPoolToggle}
            >
                <div className="text-xl font-medium">Prize pool</div>
                <div className="text-xl font-medium flex flex-nowrap items-center">
                    {data?.metadata.prize?.total.toLocaleString()}
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
                        {member.isMember && (
                            <Button
                                variant="custom"
                                size="sm"
                                className="block mb-2 ml-auto opacity-70 hover:opacity-100 transition-opacity duration-200"
                                onClick={onUpdatePrizePoolModal}
                            >
                                <FontAwesomeIcon icon={faPencil} className="mr-2" />
                                Update
                            </Button>
                        )}

                        <HackatonPrizePoolPlaces
                            places={data?.metadata.prize?.places || []}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export { HackatonPrizePoolOverview }

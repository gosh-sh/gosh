import { faStar } from '@fortawesome/free-regular-svg-icons'
import { faChevronDown, faTrophy } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import classNames from 'classnames'
import { AnimatePresence, motion } from 'framer-motion'
import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Textarea } from '../../../components/Form'
import Loader from '../../../components/Loader'
import { useClickOutside } from '../../../hooks/common.hooks'
import { DaoMemberWallet, DaoMembers, DaoSupply } from '../../components/Dao'
import { useDao, useDaoMember } from '../../hooks/dao.hooks'
import { useDaoHackathonList } from '../../hooks/hackathon.hooks'
import { EHackathonType } from '../../types/hackathon.types'
import { ListBoundary } from './components'

const DaoHackathonListPage = (props: { count?: number }) => {
    const { count = 10 } = props
    const navigate = useNavigate()
    const dao = useDao()
    const member = useDaoMember()
    const hackathons = useDaoHackathonList()
    const [create_name, setCreateName] = useState<string>('')
    const [create_open, setCreateOpen] = useState<boolean>(false)
    const create_ref = useRef<HTMLDivElement>(null)

    useClickOutside(create_ref, () => {
        setCreateOpen(false)
    })

    const onCreateOpen = () => {
        setCreateOpen(true)
    }

    const onCreateNameChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCreateName(e.target.value)
    }

    const onCreateClick = (type: EHackathonType) => {
        const state = { type, name: create_name.trim() }
        navigate(`/o/${dao.details.name}/hacksgrants/create`, { state })
    }

    return (
        <div className="row flex-wrap">
            <div className="col !basis-full md:!basis-0">
                <div className="flex items-center justify-between pb-2 mb-4 gap-4">
                    <h3 className="text-xl font-medium">Hacks & Grants</h3>
                    {hackathons.is_fetching && (
                        <Loader className="text-xs">Updating...</Loader>
                    )}
                </div>

                {member.isMember && (
                    <div
                        ref={create_ref}
                        className={classNames(
                            'mb-6 p-3 border rounded-xl transition-colors duration-200',
                            create_open ? 'bg-white' : 'bg-gray-fafafd',
                        )}
                    >
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-4">
                            <Textarea
                                className="grow border-0"
                                placeholder="Add name to create..."
                                autoComplete="off"
                                value={create_name}
                                maxRows={5}
                                onClick={onCreateOpen}
                                onChange={onCreateNameChange}
                            />

                            <AnimatePresence>
                                {!create_open && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="basis-full sm:basis-0"
                                    >
                                        <Button className="w-full" onClick={onCreateOpen}>
                                            Create new
                                            <FontAwesomeIcon
                                                icon={faChevronDown}
                                                size="sm"
                                                className="ml-2"
                                            />
                                        </Button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <AnimatePresence>
                            {create_open && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-4 flex items-center justify-end gap-x-4 gap-y-2
                                    flex-wrap sm:flex-nowrap"
                                >
                                    <Button
                                        variant="custom"
                                        className="block whitespace-nowrap disabled:opacity-50
                                        text-white bg-blue-2b89ff hover:bg-opacity-90
                                        w-full sm:w-auto"
                                        disabled={!create_name.trim().length}
                                        onClick={() =>
                                            onCreateClick(EHackathonType.HACKATHON)
                                        }
                                    >
                                        <FontAwesomeIcon icon={faStar} className="mr-2" />
                                        New hackathon
                                    </Button>
                                    <Button
                                        variant="custom"
                                        className="block whitespace-nowrap disabled:opacity-50
                                        text-white bg-red-ff6c4d hover:bg-opacity-90
                                        w-full sm:w-auto"
                                        disabled
                                        onClick={() =>
                                            onCreateClick(EHackathonType.GRANT)
                                        }
                                    >
                                        <FontAwesomeIcon
                                            icon={faTrophy}
                                            className="mr-2"
                                        />
                                        New grant (soon)
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                <ListBoundary count={count} />
            </div>

            <div className="col !max-w-full md:!max-w-side-right-md xl:!max-w-side-right">
                <div className="flex flex-col gap-y-5">
                    <DaoSupply />
                    {member.isMember && <DaoMemberWallet />}
                    <DaoMembers />
                </div>
            </div>
        </div>
    )
}

export default DaoHackathonListPage

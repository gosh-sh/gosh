import { faComment } from '@fortawesome/free-regular-svg-icons'
import { faChevronDown, faTrophy } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Menu } from '@headlessui/react'
import classNames from 'classnames'
import { motion } from 'framer-motion'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input } from '../../../components/Form'
import Loader from '../../../components/Loader'
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
    const [createName, setCreateName] = useState<string>('')

    const onCreateNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCreateName(e.target.value)
    }

    const onCreateClick = (type: EHackathonType) => {
        const state = { type, name: createName }
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
                    <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
                        <Input
                            className="grow"
                            type="text"
                            placeholder="Add name to create..."
                            autoComplete="off"
                            value={createName}
                            onChange={onCreateNameChange}
                        />

                        <Menu as="div" className="relative">
                            <Menu.Button as={Button} disabled={!createName}>
                                {({ open }) => (
                                    <>
                                        Create new
                                        <FontAwesomeIcon
                                            icon={faChevronDown}
                                            size="sm"
                                            className={classNames(
                                                'ml-2 transition-transform duration-200',
                                                open ? 'rotate-180' : 'rotate-0',
                                            )}
                                        />
                                    </>
                                )}
                            </Menu.Button>

                            <Menu.Items
                                as={motion.div}
                                className="absolute origin-top-right right-0 bg-white border border-gray-e6edff rounded-lg mt-2 z-50 py-2"
                                initial={{ opacity: 0, translateY: '0.25rem' }}
                                animate={{ opacity: 1, translateY: 0 }}
                                exit={{ opacity: 0, translateY: '0.25rem' }}
                                transition={{ duration: 0.2 }}
                            >
                                <Menu.Item
                                    as={Button}
                                    variant="custom"
                                    className="block px-4 py-2 whitespace-nowrap
                                    text-sm text-blue-2b89ff/80 hover:text-blue-2b89ff"
                                    onClick={() =>
                                        onCreateClick(EHackathonType.HACKATHON)
                                    }
                                >
                                    <FontAwesomeIcon
                                        icon={faComment}
                                        fixedWidth
                                        className="mr-2"
                                    />
                                    New hackathon
                                </Menu.Item>
                                <Menu.Item
                                    as={Button}
                                    variant="custom"
                                    className="block px-4 py-2 whitespace-nowrap
                                    text-sm text-red-ff6c4d/80 hover:text-red-ff6c4d"
                                    onClick={() => onCreateClick(EHackathonType.GRANT)}
                                >
                                    <FontAwesomeIcon
                                        icon={faTrophy}
                                        fixedWidth
                                        className="mr-2"
                                    />
                                    New grant
                                </Menu.Item>
                            </Menu.Items>
                        </Menu>
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

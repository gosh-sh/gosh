import { Button, Input } from '../../../components/Form'
import { ListBoundary } from './components'
import { useDao, useDaoMember } from '../../hooks/dao.hooks'
import { DaoMemberWallet, DaoMembers, DaoSupply } from '../../components/Dao'
import { useDaoRepositoryList } from '../../hooks/repository.hooks'
import Loader from '../../../components/Loader'
import { Menu } from '@headlessui/react'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faTrophy } from '@fortawesome/free-solid-svg-icons'
import classNames from 'classnames'
import { faComment } from '@fortawesome/free-regular-svg-icons'
import { Link } from 'react-router-dom'

const DaoHackGrantListPage = (props: { count?: number }) => {
    const { count = 10 } = props
    const dao = useDao()
    const member = useDaoMember()
    const repositories = useDaoRepositoryList({ initialize: true, count })

    const onCreateClick = () => {}

    return (
        <div className="row flex-wrap">
            <div className="col !basis-full md:!basis-0">
                <div className="flex items-center justify-between pb-2 mb-4 gap-4">
                    <h3 className="text-xl font-medium">Hacks & Grants</h3>
                    {repositories.isFetching && (
                        <Loader className="text-xs">Updating...</Loader>
                    )}
                </div>

                <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
                    <Input
                        className="grow"
                        type="text"
                        placeholder="Add name to create..."
                        autoComplete="off"
                    />
                    {member.isMember && (
                        <Menu as="div" className="relative">
                            <Menu.Button as={Button}>
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
                                    as={Link}
                                    to={`/o/${dao.details.name}/hacksgrants/create/hack`}
                                    className="block px-4 py-2 whitespace-nowrap
                                    text-sm text-blue-2b89ff/80 hover:text-blue-2b89ff"
                                >
                                    <FontAwesomeIcon
                                        icon={faComment}
                                        fixedWidth
                                        className="mr-2"
                                    />
                                    New hackaton
                                </Menu.Item>
                                <Menu.Item
                                    as={Link}
                                    to={`/o/${dao.details.name}/hacksgrants/create/grant`}
                                    className="block px-4 py-2 whitespace-nowrap
                                    text-sm text-red-ff6c4d/80 hover:text-red-ff6c4d"
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
                    )}
                </div>

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

export default DaoHackGrantListPage

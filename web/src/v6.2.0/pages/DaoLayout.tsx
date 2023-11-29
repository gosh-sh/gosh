import classNames from 'classnames'
import { useEffect } from 'react'
import { useErrorBoundary, withErrorBoundary } from 'react-error-boundary'
import { Link, NavLink, useParams } from 'react-router-dom'
import { Tooltip } from 'react-tooltip'
import Alert from '../../components/Alert'
import CopyClipboard from '../../components/CopyClipboard'
import { getIdenticonAvatar } from '../../helpers'
import { shortString } from '../../utils'
import { DaoSummary, DaoUpgradeNotification } from '../components/Dao'
import { AnimatedOutlet } from '../components/Outlet'
import { withPin, withRouteAnimation } from '../hocs'
import { useDao, useDaoMember } from '../hooks/dao.hooks'

const DaoLayout = () => {
    const { daoname } = useParams()
    const dao = useDao({ initialize: true, subscribe: true })
    const member = useDaoMember({ initialize: true, subscribe: true })
    const { showBoundary } = useErrorBoundary()

    const getTabs = () => {
        const tabs = [
            { to: `/o/${daoname}`, title: 'Overview', order: 0 },
            { to: `/o/${daoname}/events`, title: 'DAO', order: 1 },
            { to: `/o/${daoname}/r`, title: 'Repositories', order: 2 },
            { to: `/o/${daoname}/members`, title: 'Members', order: 3 },
            { to: `/o/${daoname}/hacksgrants`, title: 'Hacks & Grants', order: 4 },
            { to: `/o/${daoname}/tasks`, title: 'Tasks', order: 5 },
        ]

        if (member.isMember) {
            tabs.push({ to: `/o/${daoname}/settings`, title: 'Settings', order: 6 })
            tabs.push({ to: `/o/${daoname}/l2`, title: 'Ethereum', order: 7 })
        }

        return tabs.sort((a, b) => a.order - b.order)
    }

    useEffect(() => {
        if (dao.error) {
            showBoundary(dao.error)
        }
    }, [dao.error])

    return (
        <div className="container py-10">
            <div className="row mb-6">
                <div className="col !grow-0">
                    <div className="overflow-hidden rounded-xl w-12 md:w-16 lg:w-20">
                        <img
                            src={getIdenticonAvatar({ seed: daoname }).toDataUriSync()}
                            className="w-full"
                            alt=""
                        />
                    </div>
                </div>
                <div className="col overflow-hidden">
                    <h1>
                        <Link
                            to={`/o/${daoname}`}
                            className="font-medium text-2xl capitalize"
                        >
                            {daoname}
                        </Link>
                        <span
                            className="mx-2 align-super text-xs font-normal text-gray-7c8db5"
                            data-tip="DAO version"
                        >
                            {dao.details.version}
                        </span>
                    </h1>

                    {!!dao.details.tags?.length && (
                        <div className="mt-1 flex flex-wrap gap-1">
                            {dao.details.tags.map((tag, index) => (
                                <span
                                    key={index}
                                    className={classNames(
                                        'border border-gray-e6edff rounded px-2',
                                        'text-xs text-gray-7c8db5',
                                    )}
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}

                    <DaoSummary className="my-2 text-sm" />

                    <CopyClipboard
                        className="w-fit text-xs text-gray-7c8db5"
                        label={
                            <span
                                data-tooltip-id="common-tip"
                                data-tooltip-content="DAO address"
                            >
                                {shortString(dao.details.account?.address || '')}
                            </span>
                        }
                        componentProps={{
                            text: dao.details.account?.address || '',
                        }}
                    />
                </div>
            </div>

            <DaoUpgradeNotification className="mb-6" />

            <div
                className={classNames(
                    'flex gap-x-8 mb-6 overflow-x-auto no-scrollbar',
                    'border-b border-b-gray-e6edff',
                )}
            >
                {getTabs().map((item, index) => (
                    <NavLink
                        key={index}
                        to={item.to}
                        end={index === 0}
                        className={({ isActive }) =>
                            classNames(
                                'text-gray-7c8db5 pt-1.5 pb-4',
                                'border-b-4 border-b-transparent whitespace-nowrap',
                                'hover:text-black hover:border-b-black',
                                isActive ? '!text-black !border-b-black' : null,
                            )
                        }
                    >
                        {item.title}
                    </NavLink>
                ))}
            </div>

            <AnimatedOutlet />
            <Tooltip id="common-tip" clickable />
        </div>
    )
}

export default withErrorBoundary(
    withRouteAnimation(withPin(DaoLayout, { redirect: false })),
    {
        fallbackRender: ({ error }) => (
            <div className="container py-10">
                <Alert variant="danger">{error.message}</Alert>
            </div>
        ),
    },
)

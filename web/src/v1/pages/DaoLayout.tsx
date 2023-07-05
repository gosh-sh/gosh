import { useEffect } from 'react'
import { Link, NavLink, useParams } from 'react-router-dom'
import CopyClipboard from '../../components/CopyClipboard'
import { Tooltip } from 'react-tooltip'
import { getIdenticonAvatar } from '../../helpers'
import { DaoNotification } from '../../components/Dao'
import classNames from 'classnames'
import { withRouteAnimation, withPin } from '../hocs'
import { useDao, useDaoMember } from '../hooks/dao.hooks'
import { useErrorBoundary, withErrorBoundary } from 'react-error-boundary'
import Alert from '../../components/Alert'
import { shortString } from '../../utils'
import { ToastStatus } from '../../components/Toast'
import { AnimatedOutlet } from '../components/Outlet'

const DaoLayout = () => {
    const { daoName } = useParams()
    const dao = useDao({ loadOnInit: true })
    const member = useDaoMember({ loadOnInit: true, subscribe: true })
    const { showBoundary } = useErrorBoundary()

    const getTabs = () => {
        const tabs = [
            { to: `/o/${daoName}`, title: 'Overview', order: 0 },
            { to: `/o/${daoName}/events`, title: 'DAO', order: 1 },
            { to: `/o/${daoName}/repos`, title: 'Repositories', order: 2 },
            { to: `/o/${daoName}/members`, title: 'Members', order: 3 },
        ]

        if (member.details.isMember) {
            tabs.push({ to: `/o/${daoName}/settings`, title: 'Settings', order: 4 })
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
                            src={getIdenticonAvatar({ seed: daoName }).toDataUriSync()}
                            className="w-full"
                            alt=""
                        />
                    </div>
                </div>
                <div className="col">
                    <h1 className="mb-2">
                        <Link
                            to={`/o/${daoName}`}
                            className="font-medium text-2xl capitalize"
                        >
                            {daoName}
                        </Link>
                        <span
                            className="mx-2 align-super text-xs font-normal text-gray-7c8db5"
                            data-tip="DAO version"
                        >
                            {dao.details.version}
                        </span>
                    </h1>
                    <CopyClipboard
                        className="text-xs text-gray-7c8db5"
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

            {/* {dao.details && dao.adapter && (
                        <div className="mb-6">
                            <DaoNotification
                                dao={{ details: dao.details, adapter: dao.adapter }}
                            />
                        </div>
                    )} */}

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
                                'border-b-4 border-b-transparent',
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

            <ToastStatus status={member.status} />
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

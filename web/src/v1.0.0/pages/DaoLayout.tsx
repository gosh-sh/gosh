import { useEffect } from 'react'
import { Link, NavLink, useParams } from 'react-router-dom'
import CopyClipboard from '../../components/CopyClipboard'
import { Tooltip } from 'react-tooltip'
import { getIdenticonAvatar } from '../../helpers'
import { DaoUpgradeNotification } from '../components/Dao'
import classNames from 'classnames'
import { withRouteAnimation, withPin } from '../hocs'
import { useDao, useDaoMember } from '../hooks/dao.hooks'
import { useErrorBoundary, withErrorBoundary } from 'react-error-boundary'
import Alert from '../../components/Alert'
import { shortString } from '../../utils'
import { AnimatedOutlet } from '../components/Outlet'

const DaoLayout = () => {
    const { daoname } = useParams()
    const dao = useDao({ initialize: true, subscribe: true })
    const member = useDaoMember({ initialize: true, subscribe: true })
    const { showBoundary } = useErrorBoundary()

    const getTabs = () => {
        const tabs = [
            { to: `/o/${daoname}`, title: 'Overview', order: 0 },
            { to: `/o/${daoname}/events`, title: 'DAO', order: 1 },
            { to: `/o/${daoname}/repos`, title: 'Repositories', order: 2 },
            { to: `/o/${daoname}/members`, title: 'Members', order: 3 },
        ]

        if (member.isMember) {
            tabs.push({ to: `/o/${daoname}/settings`, title: 'Settings', order: 4 })
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
                    <h1 className="mb-2">
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

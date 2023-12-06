import classNames from 'classnames'
import { useEffect } from 'react'
import { useErrorBoundary, withErrorBoundary } from 'react-error-boundary'
import { Link, NavLink, useParams } from 'react-router-dom'
import Alert from '../../components/Alert'
import Skeleton from '../../components/Skeleton'
import { HackathonTypeBadge } from '../components/Hackathon'
import { AnimatedOutlet } from '../components/Outlet'
import { withPin, withRouteAnimation } from '../hocs'
import { useDao, useDaoMember } from '../hooks/dao.hooks'
import { useHackathon } from '../hooks/hackathon.hooks'

const HackathonLayout = () => {
    const { daoname, address } = useParams()
    const { showBoundary } = useErrorBoundary()
    const dao = useDao({ initialize: true, subscribe: true })
    const { hackathon, error: hackathon_error } = useHackathon({
        initialize: true,
        subscribe: true,
    })
    useDaoMember({ initialize: true, subscribe: true })

    const getTabs = () => {
        const tabs = [
            { to: `/o/${daoname}/hacksgrants/${address}`, title: 'Overview', order: 0 },
            {
                to: `/o/${daoname}/hacksgrants/${address}/rewards`,
                title: 'Rewards',
                order: 1,
            },
            {
                to: `/o/${daoname}/hacksgrants/${address}/participants`,
                title: 'Participants',
                order: 2,
            },
        ]

        return tabs.sort((a, b) => a.order - b.order)
    }

    useEffect(() => {
        if (dao.error) {
            showBoundary(dao.error)
        }
        if (hackathon_error) {
            showBoundary(hackathon_error)
        }
    }, [dao.error, hackathon_error])

    if (!hackathon) {
        return (
            <div className="container py-10">
                <Skeleton skeleton={{ height: 48 }} className="py-5">
                    <rect x="0" y="0" rx="4" ry="4" width="100%" height="12" />
                    <rect x="0" y="18" rx="4" ry="4" width="100%" height="12" />
                    <rect x="0" y="36" rx="4" ry="4" width="100%" height="12" />
                </Skeleton>
            </div>
        )
    }

    return (
        <div className="container py-10">
            <h1 className="mb-5 text-xl flex flex-wrap items-center gap-x-3">
                <div>
                    <Link
                        to={`/o/${daoname}/hacksgrants`}
                        className="font-medium capitalize text-blue-2b89ff"
                    >
                        {daoname}
                    </Link>
                    <span className="mx-1">/</span>
                    <span className="font-medium">{hackathon.name}</span>
                </div>

                {hackathon && <HackathonTypeBadge type={hackathon.type} />}
            </h1>

            <div className="flex gap-x-8 mb-6 overflow-x-auto no-scrollbar border-b border-b-gray-e6edff">
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
        </div>
    )
}

export default withErrorBoundary(
    withRouteAnimation(withPin(HackathonLayout, { redirect: false })),
    {
        fallbackRender: ({ error }) => (
            <div className="container py-10">
                <Alert variant="danger">{error.message}</Alert>
            </div>
        ),
    },
)

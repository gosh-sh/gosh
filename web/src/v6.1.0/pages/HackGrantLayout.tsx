import { Link, NavLink, useParams } from 'react-router-dom'
import classNames from 'classnames'
import { withRouteAnimation, withPin } from '../hocs'
import { useErrorBoundary, withErrorBoundary } from 'react-error-boundary'
import Alert from '../../components/Alert'
import { AnimatedOutlet } from '../components/Outlet'
import { Badge } from '../components/Badge'

const HackGrantLayout = () => {
    const { daoname, address } = useParams()
    const { showBoundary } = useErrorBoundary()

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

    // useEffect(() => {
    //     if (dao.error) {
    //         showBoundary(dao.error)
    //     }
    // }, [dao.error])

    return (
        <div className="container py-10">
            <h1 className="mb-5 text-xl flex flex-wrap items-center gap-x-3">
                <div>
                    <Link
                        to={`/o/${daoname}`}
                        className="font-medium capitalize text-blue-2b89ff"
                    >
                        {daoname}
                    </Link>
                    <span className="mx-1">/</span>
                    <span className="font-medium">my first hackaton</span>
                </div>

                <Badge className="bg-blue-2b89ff" content="Hackaton" />
            </h1>

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
        </div>
    )
}

export default withErrorBoundary(
    withRouteAnimation(withPin(HackGrantLayout, { redirect: false })),
    {
        fallbackRender: ({ error }) => (
            <div className="container py-10">
                <Alert variant="danger">{error.message}</Alert>
            </div>
        ),
    },
)

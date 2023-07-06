import { Navigate, NavLink, useParams } from 'react-router-dom'
import { classNames } from 'react-gosh'
import { useDaoMember } from '../hooks/dao.hooks'
import { withErrorBoundary } from 'react-error-boundary'
import { withPin, withRouteAnimation } from '../hocs'
import Alert from '../../components/Alert'
import { AnimatedOutlet } from '../components/Outlet'

const DaoSettingsLayout = () => {
    const { daoName } = useParams()
    const member = useDaoMember()

    const getTabs = () => {
        const tabs = []
        tabs.push({ to: `/o/${daoName}/settings/upgrade`, title: 'Upgrade' })
        return tabs
    }

    if (!member.details.isMember) {
        return <Navigate to={`/o/${daoName}`} />
    }
    return (
        <div className="flex gap-x-8 gap-y-8 flex-wrap md:flex-nowrap">
            <div className="basis-full md:basis-1/5 flex flex-col gap-y-1">
                {getTabs().map((item, index) => (
                    <NavLink
                        key={index}
                        to={item!.to}
                        className={({ isActive }) =>
                            classNames(
                                'py-2 text-gray-7c8db5 hover:text-black',
                                isActive ? '!text-black' : null,
                            )
                        }
                    >
                        {item!.title}
                    </NavLink>
                ))}
            </div>
            <div className="basis-full md:basis-4/5 overflow-hidden">
                <AnimatedOutlet />
            </div>
        </div>
    )
}

export default withErrorBoundary(
    withRouteAnimation(withPin(DaoSettingsLayout, { redirect: false })),
    {
        fallbackRender: ({ error }) => (
            <div className="container py-10">
                <Alert variant="danger">{error.message}</Alert>
            </div>
        ),
    },
)

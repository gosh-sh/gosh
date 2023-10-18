import { NavLink, useParams } from 'react-router-dom'
import { withErrorBoundary } from 'react-error-boundary'
import { withPin, withRouteAnimation } from '../hocs'
import Alert from '../../components/Alert'
import { AnimatedOutlet } from '../components/Outlet'
import classNames from 'classnames'

const DaoSettingsLayout = () => {
    const { daoname } = useParams()

    const getTabs = () => {
        const tabs = []
        tabs.push({ to: `/o/${daoname}/settings/setup`, title: 'Setup' })
        tabs.push({ to: `/o/${daoname}/settings/upgrade`, title: 'Upgrade' })
        return tabs
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

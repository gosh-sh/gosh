import { NavLink } from 'react-router-dom'
import { classNames } from 'react-gosh'
import { withErrorBoundary } from 'react-error-boundary'
import { withPin, withRouteAnimation } from '../hocs'
import Alert from '../../components/Alert'
import { AnimatedOutlet } from '../components/Outlet'
import { faGear, faLock, faUser } from '@fortawesome/free-solid-svg-icons'
import { faBell } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const AccountSettingsLayout = () => {
    const getTabs = () => {
        const tabs = []
        tabs.push({ to: `/a/settings/details`, title: 'Main info', icon: faUser })
        tabs.push({
            to: `/a/settings/notifications`,
            title: 'Notifications',
            icon: faBell,
        })
        tabs.push({ to: `/a/settings/security`, title: 'Security', icon: faLock })
        tabs.push({ to: `/a/settings/git-remote`, title: 'Git remote', icon: faGear })
        return tabs
    }

    return (
        <div className="flex gap-x-8 gap-y-8 flex-wrap md:flex-nowrap">
            <div className="basis-full md:basis-1/5 flex flex-col gap-y-1">
                {getTabs().map((item, index) => (
                    <NavLink
                        key={index}
                        to={item.to}
                        className={({ isActive }) =>
                            classNames(
                                'py-2 text-gray-7c8db5 hover:text-black',
                                isActive ? '!text-black' : null,
                            )
                        }
                    >
                        <FontAwesomeIcon icon={item.icon} fixedWidth className="mr-2" />
                        {item.title}
                    </NavLink>
                ))}
            </div>
            <div className="basis-full md:basis-4/5 overflow-hidden">
                <div className="border border-gray-e6edff rounded-xl p-5">
                    <AnimatedOutlet />
                </div>
            </div>
        </div>
    )
}

export default withErrorBoundary(
    withRouteAnimation(withPin(AccountSettingsLayout, { redirect: true })),
    {
        fallbackRender: ({ error }) => (
            <div className="container py-10">
                <Alert variant="danger">{error.message}</Alert>
            </div>
        ),
    },
)

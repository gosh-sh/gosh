import { Outlet } from 'react-router-dom'
import { useRecoilValue } from 'recoil'
import { onboardingDataAtom } from '../store/onboarding.state'
import OnboardingComplete from './Onboarding/components/Complete'

const AccountLayout = () => {
    const { step } = useRecoilValue(onboardingDataAtom)
    const tabs = [
        { to: '/a/orgs', title: 'Organizations' },
        // { to: '/a/repos', title: 'Repositories' },
        { to: '/a/settings', title: 'Settings' },
    ]

    return (
        <div className="container container--full mt-12 mb-5">
            {step === 'complete' && <OnboardingComplete />}

            <div className="bordered-block px-7 py-8">
                <h1 className="font-semibold text-2xl mb-5">User account</h1>

                <div className="flex gap-x-8 gap-y-8 flex-wrap md:flex-nowrap">
                    <div className="basis-full md:basis-1/5 flex flex-col gap-y-1">
                        {tabs.map((item, index) => (
                            <NavLink
                                key={index}
                                to={item.to}
                                className={({ isActive }) =>
                                    classNames(
                                        'py-2 text-base text-gray-050a15/50 hover:text-gray-050a15',
                                        isActive ? '!text-gray-050a15' : null,
                                    )
                                }
                            >
                                {item.title}
                            </NavLink>
                        ))}
                    </div>
                    <div className="basis-full md:basis-4/5">
                        <Outlet />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AccountLayout

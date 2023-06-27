import { Outlet } from 'react-router-dom'
import { useRecoilValue } from 'recoil'
import { onboardingDataAtom } from '../store/onboarding.state'
import { withPin, withRouteAnimation } from '../hocs'
import OnboardingComplete from './Onboarding/components/Complete'

const AccountLayout = () => {
    const { step } = useRecoilValue(onboardingDataAtom)

    return (
        <div className="container py-10">
            {step === 'complete' && <OnboardingComplete />}
            <Outlet />
        </div>
    )
}

export default withRouteAnimation(withPin(AccountLayout, { redirect: true }))

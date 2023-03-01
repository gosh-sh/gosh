import { Outlet } from 'react-router-dom'
import { useRecoilValue } from 'recoil'
import SideMenuContainer from '../components/SideMenuContainer'
import { onboardingDataAtom } from '../store/onboarding.state'
import OnboardingComplete from './Onboarding/components/Complete'

const AccountLayout = () => {
    const { step } = useRecoilValue(onboardingDataAtom)

    return (
        <SideMenuContainer>
            {step === 'complete' && <OnboardingComplete />}
            <Outlet />
        </SideMenuContainer>
    )
}

export default AccountLayout

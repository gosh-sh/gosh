import { useRecoilValue } from 'recoil'
import { onboardingDataAtom } from '../store/onboarding.state'
import { withPin, withRouteAnimation } from '../hocs'
import OnboardingComplete from './Onboarding/components/Complete'
import { AnimatedOutlet } from '../components/Outlet'

const AccountLayout = () => {
  const { step } = useRecoilValue(onboardingDataAtom)

  return (
    <div className="container py-10">
      {step === 'complete' && <OnboardingComplete />}
      <AnimatedOutlet />
    </div>
  )
}

export default withRouteAnimation(withPin(AccountLayout, { redirect: true }))

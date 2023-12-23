import { withPin, withRouteAnimation } from '../hocs'
import { OnboardingComplete } from './Onboarding/components'
import { AnimatedOutlet } from '../components/Outlet'
import { useOnboardingData } from '../hooks/onboarding.hooks'

const AccountLayout = () => {
  const { data } = useOnboardingData()

  return (
    <div className="container py-10">
      {data.step === 'complete' && <OnboardingComplete />}
      <AnimatedOutlet />
    </div>
  )
}

export default withRouteAnimation(withPin(AccountLayout, { redirect: true }))

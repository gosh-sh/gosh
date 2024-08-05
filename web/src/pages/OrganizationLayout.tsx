import { withPin, withRouteAnimation } from "../hocs";
import { AnimatedOutlet } from "../components/Outlet";
import { useOnboardingData } from "../hooks/onboarding.hooks";
import { Header } from "../components/Header";

const BaseLayout = () => {
  const { data } = useOnboardingData();

  return (
    <>
      {/* <Header /> */}
      <main id="main" className="grow ml-[72px]">
        <AnimatedOutlet />
      </main>
    </>
  );
};

export default withRouteAnimation(withPin(BaseLayout, { redirect: true }));

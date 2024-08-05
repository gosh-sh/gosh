import { withPin, withRouteAnimation } from "../hocs";
import { AnimatedOutlet } from "../components/Outlet";
import { useOnboardingData } from "../hooks/onboarding.hooks";
import { HeaderBase } from "../components/Header";

const BaseLayout = () => {
  const { data } = useOnboardingData();

  return (
    <>
      {/* <HeaderBase /> */}
      <main id="main" className="grow ml-[250px]">
        <AnimatedOutlet />
      </main>
    </>
  );
};

export default withRouteAnimation(withPin(BaseLayout, { redirect: true }));

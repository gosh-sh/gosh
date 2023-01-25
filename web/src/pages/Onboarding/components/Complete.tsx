import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useRecoilValue, useResetRecoilState } from 'recoil'
import { onboardingDataAtom } from '../../../store/onboarding.state'
import githubgosh from '../../../assets/images/githubgosh.svg'

const OnboardingComplete = () => {
    const { username, email } = useRecoilValue(onboardingDataAtom)
    const onboardingReset = useResetRecoilState(onboardingDataAtom)

    return (
        <div className="signup signup--complete">
            <button
                type="button"
                className="signup__dismiss-btn"
                onClick={onboardingReset}
            >
                <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>

            <div className="signup__aside signup__aside--complete aside-step">
                <div className="aside-step__header">
                    <div className="aside-step__text">
                        Welcome to GOSH, <br />
                        {username}
                    </div>
                </div>

                <p className="aside-step__text-secondary">
                    When the repositories are uploaded we will send a notification to
                    <span className="aside-step__text-blue"> {email}</span>
                </p>
            </div>
            <div className="signup__content signup__content--first">
                <img src={githubgosh} alt="" />
            </div>
        </div>
    )
}

export default OnboardingComplete

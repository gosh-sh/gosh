import { faArrowRightFromBracket } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useRecoilValue } from 'recoil'
import { OAuthSessionAtom } from '../../../store/onboarding.state'

type TOAuthProfileProps = {
    onSignout(): Promise<void>
}

const OAuthProfile = (props: TOAuthProfileProps) => {
    const { onSignout } = props
    const { session } = useRecoilValue(OAuthSessionAtom)

    return (
        <button type="button" className="aside-step__btn-signout" onClick={onSignout}>
            <div className="aside-step__btn-signout-slide">
                <span className="aside-step__btn-signout-user">
                    Hey, {session?.user.user_metadata.name}
                </span>
                <span className="aside-step__btn-signout-text">Sign out</span>
            </div>
            <FontAwesomeIcon
                icon={faArrowRightFromBracket}
                size="lg"
                className="aside-step__btn-signout-icon"
            />
        </button>
    )
}

export default OAuthProfile

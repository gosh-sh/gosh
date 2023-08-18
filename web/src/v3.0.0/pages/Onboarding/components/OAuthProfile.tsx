import { faArrowRightFromBracket } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { TOAuthSession } from '../../../types/oauth.types'

type TOAuthProfileProps = {
    oauth: TOAuthSession
    onSignout(): Promise<void>
}

const OAuthProfile = (props: TOAuthProfileProps) => {
    const { oauth, onSignout } = props

    return (
        <button
            type="button"
            className="group block w-full h-12 rounded-lg py-2 hover:bg-gray-fafafd hover:px-3 transition-all"
            onClick={onSignout}
        >
            <div className="flex flex-nowrap items-center justify-between">
                <div className="grow">
                    <div className="flex flex-nowrap items-center gap-3 group-hover:hidden">
                        <div className="w-8 shrink-0 overflow-hidden rounded-full">
                            <img
                                src={oauth?.session?.user.user_metadata.avatar_url}
                                className="w-full"
                            />
                        </div>
                        <div className="text-xl overflow-ellipsis">
                            Hey, {oauth?.session?.user.user_metadata.name}
                        </div>
                    </div>
                    <div className="text-xl text-start hidden group-hover:block">
                        Sign out
                    </div>
                </div>
                <div>
                    <FontAwesomeIcon icon={faArrowRightFromBracket} size="lg" />
                </div>
            </div>
        </button>
    )
}

export default OAuthProfile

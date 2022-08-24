import { useState } from 'react'
import { useRecoilValue } from 'recoil'
import CopyClipboard from '../../components/CopyClipboard'
import { userStateAtom } from '../../store/user.state'
import { shortString } from '../../utils'

const SettingsPage = () => {
    const userState = useRecoilValue(userStateAtom)
    const [showPrivate, setShowPrivate] = useState<boolean>(false)
    const [showPhrase, setShowPhrase] = useState<boolean>(false)

    const onShowPrivateToggle = () => setShowPrivate(!showPrivate)

    const onShowPhraseToggle = () => setShowPhrase(!showPhrase)

    return (
        <div>
            <div>
                <h3 className="text-xl font-semibold">My public key</h3>
                <p>Share it with DAO owner to add you to participants list</p>
                {userState.keys && (
                    <CopyClipboard
                        className="mt-4"
                        label={shortString(`0x${userState.keys.public}`, 10, 10)}
                        componentProps={{
                            text: `0x${userState.keys.public}`,
                        }}
                    />
                )}
            </div>

            <div>
                <h3 className="text-xl font-semibold mt-5">My private key</h3>
                <p>Don't share it with anybody</p>
                {userState.keys?.secret && showPrivate && (
                    <CopyClipboard
                        className="mt-4"
                        label={shortString(`0x${userState.keys.secret}`, 10, 10)}
                        componentProps={{
                            text: `0x${userState.keys.secret}`,
                        }}
                    />
                )}
                <button
                    className="btn btn--body btn--sm !font-normal px-4 py-1.5 mt-2"
                    type="button"
                    onClick={onShowPrivateToggle}
                >
                    {showPrivate ? 'Hide' : 'Show'}
                </button>
            </div>

            <div>
                <h3 className="text-xl font-semibold mt-5">My seed phrase</h3>
                <p>Don't share it with anybody</p>
                {userState.phrase && showPhrase && (
                    <CopyClipboard
                        className="mt-4"
                        label={userState.phrase}
                        componentProps={{
                            text: userState.phrase,
                        }}
                    />
                )}
                <button
                    className="btn btn--body btn--sm !font-normal px-4 py-1.5 mt-2"
                    type="button"
                    onClick={onShowPhraseToggle}
                >
                    {showPhrase ? 'Hide' : 'Show'}
                </button>
            </div>
        </div>
    )
}

export default SettingsPage

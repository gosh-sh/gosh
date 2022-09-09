import { useState } from 'react'
import CopyClipboard from '../../components/CopyClipboard'
import { shortString, useUser } from 'react-gosh'

const SettingsPage = () => {
    const { user } = useUser()
    const [showPrivate, setShowPrivate] = useState<boolean>(false)
    const [showPhrase, setShowPhrase] = useState<boolean>(false)
    const [showRemote, setShowRemote] = useState<boolean>(false)

    const networkName = 'mainnet'
    const gitRemoteCredentials = {
        'primary-network': networkName,
        networks: {
            [networkName]: {
                'user-wallet': {
                    pubkey: user.keys?.public,
                    secret: user.keys?.secret,
                },
                // TODO: fix possible undefined
                endpoints: process.env.REACT_APP_GOSH_NETWORK?.split(','),
            },
        },
    }

    const onShowPrivateToggle = () => setShowPrivate(!showPrivate)

    const onShowPhraseToggle = () => setShowPhrase(!showPhrase)

    const onShowRemoteToggle = () => setShowRemote(!showRemote)

    return (
        <div>
            <div>
                <h3 className="text-xl font-semibold">My profile address</h3>
                {user.profile && (
                    <CopyClipboard
                        className="mt-2"
                        label={shortString(user.profile, 10, 10)}
                        componentProps={{
                            text: user.profile,
                        }}
                    />
                )}
            </div>

            <div className="mt-5">
                <h3 className="text-xl font-semibold">My public key</h3>
                <p>Share it with DAO owner to add you to members list</p>
                {user.keys && (
                    <CopyClipboard
                        className="mt-4"
                        label={shortString(`0x${user.keys.public}`, 10, 10)}
                        componentProps={{
                            text: `0x${user.keys.public}`,
                        }}
                    />
                )}
            </div>

            <div className="mt-5">
                <h3 className="text-xl font-semibold">My private key</h3>
                <p>Don't share it with anybody</p>
                {user.keys?.secret && showPrivate && (
                    <CopyClipboard
                        className="mt-4"
                        label={shortString(`0x${user.keys.secret}`, 10, 10)}
                        componentProps={{
                            text: `0x${user.keys.secret}`,
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

            <div className="mt-5">
                <h3 className="text-xl font-semibold">My seed phrase</h3>
                <p>Don't share it with anybody</p>
                {user.phrase && showPhrase && (
                    <CopyClipboard
                        className="mt-4"
                        label={user.phrase}
                        componentProps={{
                            text: user.phrase,
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

            <div className="mt-5">
                <h3 className="text-xl font-semibold">Git remote config</h3>
                <div>~/.gosh/config.json</div>
                {user.keys && showRemote && (
                    <div className="relative text-sm rounded-md mt-3">
                        <CopyClipboard
                            className="absolute right-3 top-3"
                            componentProps={{
                                text: JSON.stringify(gitRemoteCredentials),
                            }}
                            iconProps={{ size: 'lg' }}
                        />
                        <pre className="bg-gray-050a15/5 px-4 py-3 overflow-x-auto">
                            {JSON.stringify(gitRemoteCredentials, undefined, 2)}
                        </pre>
                    </div>
                )}

                <button
                    className="btn btn--body btn--sm !font-normal px-4 py-1.5 mt-2"
                    type="button"
                    onClick={onShowRemoteToggle}
                >
                    {showRemote ? 'Hide' : 'Show'}
                </button>
            </div>
        </div>
    )
}

export default SettingsPage

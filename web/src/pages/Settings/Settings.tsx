import React, { useState } from 'react'
import CopyClipboard from '../../components/CopyClipboard'
import { classNames, shortString, useUser } from 'react-gosh'
import { useSetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../store/app.state'
import PinCodeModal from '../../components/Modal/PinCode'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronUp, faLock } from '@fortawesome/free-solid-svg-icons'

type TLockButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    isLocked: boolean
}

const LockButton = (props: TLockButtonProps) => {
    const { isLocked, ...rest } = props
    return (
        <button type="button" className="text-gray-7c8db5 outline-none" {...rest}>
            {isLocked ? 'Show' : 'Hide'}
            <FontAwesomeIcon
                icon={isLocked ? faLock : faChevronUp}
                size="sm"
                className="ml-2"
            />
        </button>
    )
}

const SettingsPage = () => {
    const { user } = useUser()
    const setModal = useSetRecoilState(appModalStateAtom)
    const [showPrivate, setShowPrivate] = useState<boolean>(false)
    const [showPhrase, setShowPhrase] = useState<boolean>(false)
    const [showRemote, setShowRemote] = useState<boolean>(false)

    const networkName = 'mainnet'
    const gitRemoteCredentials = {
        'primary-network': networkName,
        networks: {
            [networkName]: {
                'user-wallet': {
                    profile: user.username,
                    pubkey: user.keys?.public,
                    secret: user.keys?.secret,
                },
                // TODO: fix possible undefined
                endpoints: import.meta.env.REACT_APP_GOSH_NETWORK?.split(','),
            },
        },
    }

    const onShowPrivateToggle = () => {
        if (!showPrivate) {
            setModal({
                static: true,
                isOpen: true,
                element: (
                    <PinCodeModal unlock onUnlock={() => setShowPrivate(!showPrivate)} />
                ),
            })
        } else {
            setShowPrivate(!showPrivate)
        }
    }

    const onShowPhraseToggle = () => {
        if (!showPhrase) {
            setModal({
                static: true,
                isOpen: true,
                element: (
                    <PinCodeModal unlock onUnlock={() => setShowPhrase(!showPhrase)} />
                ),
            })
        } else {
            setShowPhrase(!showPhrase)
        }
    }

    const onShowRemoteToggle = () => {
        if (!showRemote) {
            setModal({
                static: true,
                isOpen: true,
                element: (
                    <PinCodeModal unlock onUnlock={() => setShowRemote(!showRemote)} />
                ),
            })
        } else {
            setShowRemote(!showRemote)
        }
    }

    return (
        <>
            <h1 className="text-3xl font-medium">User settings</h1>

            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-4 items-center">
                <div className="basis-64">
                    <h3 className="font-medium mb-1.5">My profile name</h3>
                    <CopyClipboard
                        className="text-gray-7c8db5"
                        label={shortString(user.username!, 10, 10)}
                        componentProps={{
                            text: user.username!,
                        }}
                    />
                </div>
                <div className="text-gray-53596d text-sm">
                    Share it with DAO member to add you to members list
                </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-4 items-center">
                <div className="basis-64">
                    <h3 className="font-medium mb-1.5">My profile address</h3>
                    <CopyClipboard
                        className="text-gray-7c8db5"
                        label={shortString(user.profile!, 10, 10)}
                        componentProps={{
                            text: user.profile!,
                        }}
                    />
                </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-4 items-center">
                <div className="basis-64">
                    <h3 className="font-medium mb-1.5">My public key</h3>
                    <CopyClipboard
                        className="text-gray-7c8db5"
                        label={shortString(`0x${user.keys!.public}`, 10, 10)}
                        componentProps={{
                            text: `0x${user.keys!.public}`,
                        }}
                    />
                </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-4 items-center">
                <div className="basis-64">
                    <h3 className="font-medium mb-1.5">My private key</h3>
                    {showPrivate && (
                        <CopyClipboard
                            className="text-gray-7c8db5 mb-3"
                            label={shortString(`0x${user.keys!.secret}`, 10, 10)}
                            componentProps={{
                                text: `0x${user.keys!.secret}`,
                            }}
                        />
                    )}
                    <LockButton isLocked={!showPrivate} onClick={onShowPrivateToggle} />
                </div>
                <div className="text-gray-53596d text-sm">
                    Don't share it with anybody
                </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-4 items-center">
                <div className="basis-64">
                    <h3 className="font-medium mb-1.5">My seed phrase</h3>
                    {showPhrase && (
                        <CopyClipboard
                            className="text-gray-7c8db5 mb-3"
                            label={user.phrase}
                            componentProps={{
                                text: user.phrase!,
                            }}
                        />
                    )}
                    <LockButton isLocked={!showPhrase} onClick={onShowPhraseToggle} />
                </div>
                <div className="text-gray-53596d text-sm">
                    Don't share it with anybody
                </div>
            </div>

            <div className="mt-8">
                <h3 className="font-medium mb-1.5">Git remote config</h3>
                <div className="text-gray-7c8db5 mb-1.5">~/.gosh/config.json</div>
                {showRemote && (
                    <div
                        className={classNames(
                            'mb-3 relative px-4 py-3',
                            'border border-gray-e6edff rounded-xl bg-gray-fafafd',
                            'text-sm text-gray-7c8db5',
                        )}
                    >
                        <CopyClipboard
                            className="absolute right-3 top-3"
                            componentProps={{
                                text: JSON.stringify(gitRemoteCredentials),
                            }}
                            iconProps={{ size: 'lg' }}
                        />
                        <pre className="overflow-x-auto">
                            {JSON.stringify(gitRemoteCredentials, undefined, 2)}
                        </pre>
                    </div>
                )}
                <LockButton isLocked={!showRemote} onClick={onShowRemoteToggle} />
            </div>
        </>
    )
}

export default SettingsPage

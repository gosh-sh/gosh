import React, { useState } from 'react'
import CopyClipboard from '../../../components/CopyClipboard'
import { useSetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../../store/app.state'
import { PinCodeModal } from '../../components/Modal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronUp, faFloppyDisk, faLock } from '@fortawesome/free-solid-svg-icons'
import { useUser } from '../../hooks/user.hooks'
import { AppConfig } from '../../../appconfig'
import { shortString } from '../../../utils'
import classNames from 'classnames'
import { Button } from '../../../components/Form'
import { Transition } from '@headlessui/react'
import FileDownload from '../../../components/FileDownload'

type TLockButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  isLocked: boolean
}

const LockButton = (props: TLockButtonProps) => {
  const { isLocked, ...rest } = props
  return (
    <Button
      type="button"
      variant="custom"
      className="text-gray-7c8db5 outline-none !px-0"
      {...rest}
    >
      {isLocked ? 'Show' : 'Hide'}
      <FontAwesomeIcon
        icon={isLocked ? faLock : faChevronUp}
        size="sm"
        className="ml-2"
      />
    </Button>
  )
}

type TBlockProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string
  description?: string
}

const BlockInfo = (props: TBlockProps) => {
  const { title, description, children, className } = props

  return (
    <div className={classNames('flex flex-wrap gap-x-6 gap-y-4 items-center', className)}>
      <div className="basis-64">
        <h3 className="font-medium mb-1.5">{title}</h3>
        {children}
      </div>
      <div className="text-gray-53596d text-sm">{description}</div>
    </div>
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
        endpoints: AppConfig.endpoints,
      },
    },
  }

  const onShowPrivateToggle = () => {
    if (!showPrivate) {
      setModal({
        static: true,
        isOpen: true,
        element: <PinCodeModal unlock onUnlock={() => setShowPrivate(!showPrivate)} />,
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
        element: <PinCodeModal unlock onUnlock={() => setShowPhrase(!showPhrase)} />,
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
        element: <PinCodeModal unlock onUnlock={() => setShowRemote(!showRemote)} />,
      })
    } else {
      setShowRemote(!showRemote)
    }
  }

  return (
    <>
      <h1 className="text-3xl font-medium mb-10">User settings</h1>

      <BlockInfo
        title="My profile name"
        description="Share it with DAO member to add you to members list"
      >
        <CopyClipboard
          className="text-gray-7c8db5"
          label={shortString(user.username!, 10, 10)}
          componentProps={{
            text: user.username!,
          }}
        />
      </BlockInfo>
      <BlockInfo title="My profile address" className="mt-8">
        <CopyClipboard
          className="text-gray-7c8db5"
          label={shortString(user.profile!, 10, 10)}
          componentProps={{
            text: user.profile!,
          }}
        />
      </BlockInfo>
      <BlockInfo title="My public key" className="mt-8">
        <CopyClipboard
          className="text-gray-7c8db5"
          label={shortString(`0x${user.keys!.public}`, 10, 10)}
          componentProps={{
            text: `0x${user.keys!.public}`,
          }}
        />
      </BlockInfo>
      <BlockInfo
        title="My private key"
        description="Don't share it with anybody"
        className="mt-8"
      >
        <Transition
          show={showPrivate}
          enter="transition-opacity duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <CopyClipboard
            className="text-gray-7c8db5 mb-3"
            label={shortString(`0x${user.keys!.secret}`, 10, 10)}
            componentProps={{
              text: `0x${user.keys!.secret}`,
            }}
          />
        </Transition>
        <LockButton isLocked={!showPrivate} onClick={onShowPrivateToggle} />
      </BlockInfo>
      <BlockInfo
        title="My seed phrase"
        description="Don't share it with anybody"
        className="mt-8"
      >
        <Transition
          show={showPhrase}
          enter="transition-opacity duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <CopyClipboard
            className="text-gray-7c8db5 mb-3"
            label={user.phrase}
            componentProps={{
              text: user.phrase!,
            }}
          />
        </Transition>
        <LockButton isLocked={!showPhrase} onClick={onShowPhraseToggle} />
      </BlockInfo>
      <BlockInfo title="Git remote config" className="mt-8">
        <div className="text-gray-7c8db5 mb-1.5">~/.gosh/config.json</div>
        <Transition
          show={showRemote}
          enter="transition-opacity duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className={classNames(
              'mb-3 relative px-4 py-3',
              'border border-gray-e6edff rounded-xl bg-gray-fafafd',
              'text-sm text-gray-7c8db5',
            )}
          >
            <div className="absolute right-3 top-3 flex items-center gap-x-4">
              <FileDownload
                name="config.json"
                content={JSON.stringify(gitRemoteCredentials, undefined, 2)}
                label={<FontAwesomeIcon icon={faFloppyDisk} size="lg" />}
              />
              <CopyClipboard
                componentProps={{
                  text: JSON.stringify(gitRemoteCredentials),
                }}
                iconProps={{ size: 'lg' }}
              />
            </div>
            <pre className="overflow-x-auto">
              {JSON.stringify(gitRemoteCredentials, undefined, 2)}
            </pre>
          </div>
        </Transition>
        <LockButton isLocked={!showRemote} onClick={onShowRemoteToggle} />
      </BlockInfo>
    </>
  )
}

export default SettingsPage

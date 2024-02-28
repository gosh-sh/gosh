import { useState } from 'react'
import { useSetRecoilState } from 'recoil'
import CopyClipboard from '../../../components/CopyClipboard'
import { BlockInfo, ButtonLock } from '../../components/Account'
import { useUser } from '../../hooks/user.hooks'
import { appModalStateAtom } from '../../../store/app.state'
import { PinCodeModal } from '../../components/Modal'
import { Transition } from '@headlessui/react'
import FileDownload from '../../../components/FileDownload'
import classNames from 'classnames'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFloppyDisk } from '@fortawesome/free-solid-svg-icons'
import { AppConfig } from '../../../appconfig'

const AccountGitRemotePage = () => {
  const { user } = useUser()
  const setModal = useSetRecoilState(appModalStateAtom)
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
    <div className="flex flex-col gap-y-8">
      <BlockInfo title="Git remote config">
        <div className="text-gray-7c8db5 text-sm mb-1.5">~/.gosh/config.json</div>
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
              'text-xs text-gray-7c8db5',
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
        <ButtonLock isLocked={!showRemote} onClick={onShowRemoteToggle} />
      </BlockInfo>
    </div>
  )
}

export default AccountGitRemotePage

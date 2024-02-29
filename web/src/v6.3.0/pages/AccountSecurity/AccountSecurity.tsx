import { useState } from 'react'
import { useSetRecoilState } from 'recoil'
import CopyClipboard from '../../../components/CopyClipboard'
import { shortString } from '../../../utils'
import { BlockInfo, ButtonLock } from '../../components/Account'
import { useUser } from '../../hooks/user.hooks'
import { appModalStateAtom } from '../../../store/app.state'
import { PinCodeModal } from '../../components/Modal'
import { Transition } from '@headlessui/react'

const AccountSecurityPage = () => {
  const { user } = useUser()
  const setModal = useSetRecoilState(appModalStateAtom)
  const [showPrivate, setShowPrivate] = useState<boolean>(false)
  const [showPhrase, setShowPhrase] = useState<boolean>(false)

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

  return (
    <div className="flex flex-col gap-y-8">
      <BlockInfo title="My private key" description="Don't share it with anybody">
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
            className="text-gray-7c8db5 text-sm mb-3"
            label={shortString(`0x${user.keys!.secret}`, 10, 10)}
            componentProps={{
              text: `0x${user.keys!.secret}`,
            }}
          />
        </Transition>
        <ButtonLock isLocked={!showPrivate} onClick={onShowPrivateToggle} />
      </BlockInfo>
      <BlockInfo title="My seed phrase" description="Don't share it with anybody">
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
            className="text-gray-7c8db5 text-sm mb-3"
            label={user.phrase}
            componentProps={{
              text: user.phrase!,
            }}
          />
        </Transition>
        <ButtonLock isLocked={!showPhrase} onClick={onShowPhraseToggle} />
      </BlockInfo>
    </div>
  )
}

export default AccountSecurityPage

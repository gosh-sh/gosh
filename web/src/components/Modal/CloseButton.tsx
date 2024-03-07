import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import classNames from 'classnames'
import { useResetRecoilState, useSetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../store/app.state'
import { Button } from '../Form'

type TModalCloseButtonProps = React.HTMLAttributes<HTMLDivElement> & {
  disabled?: boolean
  two_factor?: boolean // Used for 2-factor closing
  close_custom?: boolean
  onClose?: () => Promise<void>
  twoFactorCallback?: () => void
}

const ModalCloseButton = (props: TModalCloseButtonProps) => {
  const {
    className,
    disabled,
    two_factor = false,
    close_custom = false,
    onClose,
    twoFactorCallback,
  } = props
  const setModal = useSetRecoilState(appModalStateAtom)
  const resetModal = useResetRecoilState(appModalStateAtom)

  const onModalReset = async () => {
    if (two_factor && twoFactorCallback) {
      twoFactorCallback()
    } else {
      if (!close_custom) {
        setModal((state) => ({ ...state, isOpen: false }))
        setTimeout(resetModal, 300)
      }
      onClose && (await onClose())
    }
  }

  return (
    <div className={classNames('absolute right-2 top-2', className)}>
      <Button
        type="button"
        variant="custom"
        className="px-3 py-2 text-gray-7c8db5 disabled:opacity-25"
        disabled={disabled}
        onClick={onModalReset}
      >
        <FontAwesomeIcon icon={faTimes} size="lg" />
      </Button>
    </div>
  )
}

export { ModalCloseButton }

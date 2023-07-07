import { useSetRecoilState } from 'recoil'
import { Button } from '../Form'
import { appModalStateAtom } from '../../store/app.state'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'

type TModalCloseButtonProps = {
    disabled?: boolean
    onClose?: () => Promise<void>
}

const ModalCloseButton = (props: TModalCloseButtonProps) => {
    const { disabled, onClose } = props
    const setModal = useSetRecoilState(appModalStateAtom)

    const onModalReset = async () => {
        setModal((state) => ({ ...state, isOpen: false }))
        onClose && (await onClose())
    }

    return (
        <div className="absolute right-2 top-2">
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

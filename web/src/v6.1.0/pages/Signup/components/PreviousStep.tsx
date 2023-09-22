import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button } from '../../../../components/Form'
import { useUserSignup } from '../../../hooks/user.hooks'

type TPreviousStepProps = {
    step: 'username' | 'daoinvite' | 'phrase'
    disabled?: boolean
}

const PreviousStep = (props: TPreviousStepProps) => {
    const { step, disabled } = props
    const { setStep } = useUserSignup()

    const onButtonClick = () => {
        setStep(step)
    }

    return (
        <Button
            variant="custom"
            type="button"
            className="group flex flex-nowrap items-center text-gray-7c8db5
            !px-0 !text-base hover:text-black disabled:opacity-50"
            disabled={disabled}
            onClick={onButtonClick}
        >
            <div className="rounded-full border w-10 h-10 group-hover:border-black">
                <FontAwesomeIcon icon={faArrowLeft} size="lg" className="p-2.5" />
            </div>
            <span className="ml-3">Back</span>
        </Button>
    )
}

export { PreviousStep }

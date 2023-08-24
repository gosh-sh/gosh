import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button } from '../../../../components/Form'

type TPreviousStepProps = {
    onClick(): void | Promise<void>
}

const PreviousStep = (props: TPreviousStepProps) => {
    const { onClick } = props

    return (
        <Button
            variant="custom"
            type="button"
            className="group flex flex-nowrap items-center text-gray-7c8db5 hover:text-black !px-0 !text-base"
            onClick={onClick}
        >
            <div className="rounded-full border w-10 h-10 group-hover:border-black">
                <FontAwesomeIcon icon={faArrowLeft} size="lg" className="p-2.5" />
            </div>
            <span className="ml-3">Back</span>
        </Button>
    )
}

export default PreviousStep

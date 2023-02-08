import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

type TPreviousStepProps = {
    onClick(): void | Promise<void>
}

const PreviousStep = (props: TPreviousStepProps) => {
    const { onClick } = props

    return (
        <>
            <div className="aside-step__btn-back">
                <button type="button" onClick={onClick}>
                    <FontAwesomeIcon icon={faArrowLeft} />
                </button>
            </div>
            <span className="aside-step__title">Back</span>
        </>
    )
}

export default PreviousStep

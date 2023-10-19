import { Form, Formik } from 'formik'
import { Button } from '../../../../components/Form'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleCheck, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { useL2Transfer } from '../../../hooks/l2.hooks'
import classNames from 'classnames'
import { faCircle } from '@fortawesome/free-regular-svg-icons'

const statusStyle: { [type: string]: string } = {
    base: 'inline-flex flex-nowrap items-center gap-3 py-2.5 px-5 rounded-[3.75rem]',
    awaiting: 'border border-gray-e6edff bg-white text-gray-53596d',
    pending: 'bg-yellow-eecf29/10 text-yellow-eecf29',
    completed: 'bg-green-34c759/10 text-green-34c759',
}

const statusIcon: { [type: string]: any } = {
    awaiting: faCircle,
    pending: faSpinner,
    completed: faCircleCheck,
}

const StatusBadge = (props: { type: 'awaiting' | 'pending' | 'completed' }) => {
    const { type } = props

    return (
        <div className={classNames(statusStyle.base, statusStyle[type])}>
            <FontAwesomeIcon icon={statusIcon[type]} spin={type === 'pending'} />
            <div className="text-sm font-medium first-letter:uppercase">{type}</div>
        </div>
    )
}

const TransferStep = () => {
    const { summary, setStep, submitTransferStep } = useL2Transfer()

    const onBackClick = () => {
        setStep('route')
    }

    const onFormSubmit = async () => {
        try {
            await submitTransferStep()
        } catch (e: any) {
            console.error(e.message)
        }
    }

    return (
        <div>
            <div
                className="flex flex-col border border-gray-e6edff rounded-xl
                bg-gray-fafafd py-8 lg:py-11 px-5 lg:px-8 mb-5 gap-y-8"
            >
                {summary.progress.map((item, index) => (
                    <div key={index} className="flex items-center gap-x-11">
                        <div className="basis-3/12">
                            <StatusBadge type={item.type} />
                        </div>
                        <div className="grow text-sm font-medium">{item.message}</div>
                    </div>
                ))}
            </div>

            <Formik initialValues={{}} onSubmit={onFormSubmit}>
                {({ isSubmitting }) => (
                    <Form>
                        <div className="flex items-center justify-between gap-6">
                            <div>
                                <Button
                                    type="button"
                                    size="xl"
                                    variant="outline-secondary"
                                    disabled={isSubmitting}
                                    onClick={onBackClick}
                                >
                                    Back
                                </Button>
                            </div>
                            <div>
                                <Button
                                    type="submit"
                                    size="xl"
                                    disabled={isSubmitting}
                                    isLoading={isSubmitting}
                                >
                                    Transfer
                                </Button>
                            </div>
                        </div>
                    </Form>
                )}
            </Formik>
        </div>
    )
}

export { TransferStep }

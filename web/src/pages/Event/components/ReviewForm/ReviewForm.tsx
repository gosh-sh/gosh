import { Form, Formik } from 'formik'
import { classNames, TSmvEvent } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { toast } from 'react-toastify'
import { ToastError } from '../../../../components/Toast'
import { Button } from '../../../../components/Form'

type TEventReviewFormProps = {
    dao: IGoshDaoAdapter
    event: TSmvEvent
}

type TFormValues = {
    accept: boolean
}

const EventReviewForm = (props: TEventReviewFormProps) => {
    const { dao, event } = props

    const onSubmit = async (values: TFormValues) => {
        try {
            await dao.sendEventReview({ event: event.address, decision: values.accept })
            toast.success('Review accepted. Event details will be updated soon')
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <Formik initialValues={{ accept: true }} onSubmit={onSubmit}>
            {({ isSubmitting, values, setFieldValue }) => (
                <Form>
                    <div className="mt-6 flex flex-nowrap">
                        <Button
                            type="button"
                            variant="custom"
                            className={classNames(
                                'grow bg-white text-black',
                                '!border-gray-e6edff rounded-l-lg rounded-r-none',
                                values.accept === true
                                    ? '!bg-green-34c759 !text-white !border-transparent'
                                    : null,
                            )}
                            onClick={() => setFieldValue('accept', true)}
                            disabled={isSubmitting}
                        >
                            Accept
                        </Button>
                        <Button
                            type="button"
                            variant="custom"
                            className={classNames(
                                'grow bg-white text-black',
                                '!border-gray-e6edff rounded-r-lg rounded-l-none',
                                values.accept !== true
                                    ? '!bg-red-ff3b30 !text-white !border-transparent'
                                    : null,
                            )}
                            onClick={() => setFieldValue('accept', false)}
                            disabled={isSubmitting}
                        >
                            Reject
                        </Button>
                    </div>
                    <div className="mt-4">
                        <Button
                            type="submit"
                            isLoading={isSubmitting}
                            disabled={isSubmitting}
                            className="w-full"
                        >
                            Send decision
                        </Button>
                    </div>
                </Form>
            )}
        </Formik>
    )
}

export { EventReviewForm }

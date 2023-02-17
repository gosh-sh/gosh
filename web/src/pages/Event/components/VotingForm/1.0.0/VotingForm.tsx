import { Field, Form, Formik } from 'formik'
import { classNames, TDao, TSmvEvent, useSmv, useSmvVote } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { toast } from 'react-toastify'
import ToastError from '../../../../../components/Error/ToastError'
import { Button } from '../../../../../components/Form'
import { FormikInput } from '../../../../../components/Formik'
import yup from '../../../../../yup-extended'

type TEventVotingFormProps = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
    event: TSmvEvent
}

type TFormValues = {
    approve: boolean
    amount: number
}

const EventVotingForm = (props: TEventVotingFormProps) => {
    const { dao, event } = props
    const smv = useSmv(dao)
    const { vote } = useSmvVote(dao.adapter, event)

    const onSubmit = async (values: TFormValues) => {
        try {
            await vote(values.approve === true, values.amount)
            toast.success('Vote accepted, event details will be updated soon')
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <Formik
            initialValues={{
                approve: true,
                amount: smv.details.smvAvailable - event.votes.yours,
            }}
            onSubmit={onSubmit}
            validationSchema={yup.object().shape({
                amount: yup
                    .number()
                    .min(1, 'Should be a number >= 1')
                    .max(smv.details.smvAvailable - event.votes.yours)
                    .required('Field is required'),
            })}
            enableReinitialize
        >
            {({ isSubmitting, values, setFieldValue }) => (
                <>
                    <Form>
                        <div>
                            <Field
                                name="amount"
                                component={FormikInput}
                                inputProps={{
                                    placeholder: 'Enter amount',
                                    autoComplete: 'off',
                                    after: (
                                        <div className="text-xs text-gray-7c8db5 pr-3">
                                            <div className="whitespace-nowrap leading-5 py-2">
                                                Voting height
                                            </div>
                                        </div>
                                    ),
                                }}
                                help={`Available ${
                                    smv.details.smvAvailable - event.votes.yours
                                }`}
                            />
                        </div>
                        <div className="mt-6 flex flex-nowrap">
                            <Button
                                type="button"
                                className={classNames(
                                    'grow !bg-white !text-black',
                                    'border !border-gray-e6edff',
                                    'rounded-l-lg rounded-r-none',
                                    values.approve === true
                                        ? '!bg-green-34c759 !text-white !border-transparent'
                                        : null,
                                )}
                                onClick={() => setFieldValue('approve', true)}
                            >
                                Accept
                            </Button>
                            <Button
                                type="button"
                                className={classNames(
                                    'grow !bg-white !text-black',
                                    'border-y border-r !border-gray-e6edff',
                                    'rounded-r-lg rounded-l-none',
                                    values.approve !== true
                                        ? '!bg-red-ff3b30 !text-white !border-transparent'
                                        : null,
                                )}
                                onClick={() => setFieldValue('approve', false)}
                            >
                                Reject
                            </Button>
                        </div>
                        <div className="mt-4">
                            <Button
                                className="w-full"
                                type="submit"
                                disabled={isSubmitting || smv.details.isLockerBusy}
                                isLoading={isSubmitting}
                            >
                                Send vote
                            </Button>
                        </div>
                    </Form>
                </>
            )}
        </Formik>
    )
}

export default EventVotingForm

import { Field, Form, Formik } from 'formik'
import { Button } from '../../../../../components/Form'
import { FormikInput } from '../../../../../components/Formik'
import yup from '../../../../yup-extended'
import classNames from 'classnames'
import { useCallback, useEffect, useState } from 'react'
import { TDaoEventDetails } from '../../../../types/dao.types'
import { useDaoMember, useVoteDaoEvent } from '../../../../hooks/dao.hooks'

type TDaoEventVotingFormProps = {
    event: TDaoEventDetails
}

type TFormValues = {
    approve?: boolean
    amount: number
}

const DaoEventVotingForm = (props: TDaoEventVotingFormProps) => {
    const { event } = props
    const member = useDaoMember()
    const { vote } = useVoteDaoEvent()
    const [start, setStart] = useState<number>(() =>
        Math.round((event.time.start - Date.now()) / 1000),
    )

    const getMaxAmount = useCallback(() => {
        const { balance, allowance } = member
        if (!balance || !allowance) {
            return 0
        }
        return Math.min(
            balance.voting + balance.regular - event.votes.yours,
            allowance - event.votes.yours,
        )
    }, [member, event.votes.yours])

    const onSubmit = async (values: TFormValues) => {
        try {
            await vote({
                platformId: event.platformId,
                choice: values.approve!,
                amount: values.amount,
            })
        } catch (e: any) {
            console.error(e.message)
        }
    }

    useEffect(() => {
        const interval = setInterval(() => {
            const delta = Math.round((event.time.start - Date.now()) / 1000)
            setStart(delta)
            if (delta <= 0) {
                clearInterval(interval)
            }
        }, 1000)

        return () => {
            clearInterval(interval)
        }
    }, [event.time.start])

    return (
        <Formik
            initialValues={{
                amount: getMaxAmount(),
            }}
            onSubmit={onSubmit}
            validationSchema={yup.object().shape({
                amount: yup
                    .number()
                    .min(1, 'Should be a number >= 1')
                    .max(getMaxAmount())
                    .required('Field is required'),
                approve: yup.boolean().required('Field is required'),
            })}
            enableReinitialize
        >
            {({ isSubmitting, values, setFieldValue }) => (
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
                                            Karma
                                        </div>
                                    </div>
                                ),
                            }}
                            help={`Available ${getMaxAmount()}`}
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="mt-6 flex flex-nowrap">
                        <Button
                            type="button"
                            variant="custom"
                            className={classNames(
                                'grow bg-white text-black',
                                '!border-gray-e6edff rounded-l-lg rounded-r-none',
                                values.approve === true
                                    ? '!bg-green-34c759 !text-white !border-transparent'
                                    : null,
                            )}
                            onClick={() => setFieldValue('approve', true)}
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
                                values.approve === false
                                    ? '!bg-red-ff3b30 !text-white !border-transparent'
                                    : null,
                            )}
                            onClick={() => setFieldValue('approve', false)}
                            disabled={isSubmitting}
                        >
                            Reject
                        </Button>
                    </div>
                    <div className="mt-4">
                        <Button
                            className="w-full"
                            type="submit"
                            disabled={
                                isSubmitting || values.approve === undefined || start > 0
                            }
                            isLoading={isSubmitting}
                        >
                            {start > 0
                                ? `${start.toLocaleString()}s before voting`
                                : 'Send vote'}
                        </Button>
                    </div>
                </Form>
            )}
        </Formik>
    )
}

export { DaoEventVotingForm }

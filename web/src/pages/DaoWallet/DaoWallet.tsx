import { Field, Form, Formik } from 'formik'
import { useOutletContext } from 'react-router-dom'
import { TextField } from '../../components/Formik'
import Spinner from '../../components/Spinner'
import * as Yup from 'yup'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import { useSmv, useSmvTokenTransfer } from 'react-gosh'
import { toast } from 'react-toastify'
import SmvBalance from '../../components/SmvBalance/SmvBalance'
import ToastError from '../../components/Error/ToastError'

type TMoveBalanceFormValues = {
    amount: number
}

const DaoWalletPage = () => {
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const { adapter: smv, details } = useSmv(dao)
    const { transferToSmv, transferToWallet, releaseAll } = useSmvTokenTransfer(smv)

    const onMoveBalanceToSmvBalance = async (values: TMoveBalanceFormValues) => {
        try {
            await transferToSmv(values.amount)
            toast.success('Submitted, balance will be updated soon')
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    const onMoveSmvBalanceToBalance = async (values: TMoveBalanceFormValues) => {
        try {
            await transferToWallet(values.amount)
            toast.success('Submitted, balance will be updated soon')
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    const onReleaseSmvTokens = async () => {
        try {
            await releaseAll()
            toast.success('Release submitted, tokens will be released soon')
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <>
            {dao.details.isAuthMember && (
                <SmvBalance adapter={smv} details={details} className="mb-4 !px-0" />
            )}

            <div className="divide-y divide-gray-200">
                <div className="py-5">
                    <h3 className="text-lg font-semibold">Topup SMV balance</h3>
                    <p className="mb-3">
                        Move tokens from wallet balance to SMV balance to get an ability
                        to create new proposals and vote
                    </p>
                    <Formik
                        initialValues={{ amount: details.balance }}
                        onSubmit={onMoveBalanceToSmvBalance}
                        validationSchema={Yup.object().shape({
                            amount: Yup.number()
                                .min(1)
                                .max(details.balance)
                                .required('Field is required'),
                        })}
                        enableReinitialize
                    >
                        {({ isSubmitting }) => (
                            <Form className="flex flex-wrap items-baseline gap-3">
                                <div className="grow sm:grow-0">
                                    <Field
                                        name="amount"
                                        component={TextField}
                                        inputProps={{
                                            className: '!py-2',
                                            placeholder: 'Amount',
                                            autoComplete: 'off',
                                            disabled: isSubmitting,
                                        }}
                                    />
                                </div>
                                <button
                                    className="btn btn--body !font-normal px-4 py-2 w-full sm:w-auto"
                                    type="submit"
                                    disabled={isSubmitting || details.isLockerBusy}
                                >
                                    {isSubmitting && <Spinner className="mr-2" />}
                                    Move tokens to SMV balance
                                </button>
                            </Form>
                        )}
                    </Formik>
                </div>

                <div className="py-5">
                    <h3 className="text-lg font-semibold">Release tokens</h3>
                    <p className="mb-3">
                        Move tokens from SMV balance back to wallet balance
                    </p>
                    <Formik
                        initialValues={{
                            amount: details.smvAvailable - details.smvLocked,
                        }}
                        onSubmit={onMoveSmvBalanceToBalance}
                        validationSchema={Yup.object().shape({
                            amount: Yup.number()
                                .min(1)
                                .max(details.smvAvailable - details.smvLocked)
                                .required('Field is required'),
                        })}
                        enableReinitialize
                    >
                        {({ isSubmitting }) => (
                            <Form className="flex flex-wrap items-baseline gap-3">
                                <div className="grow sm:grow-0">
                                    <Field
                                        name="amount"
                                        component={TextField}
                                        inputProps={{
                                            className: '!py-2',
                                            placeholder: 'Amount',
                                            autoComplete: 'off',
                                            disabled: isSubmitting,
                                        }}
                                    />
                                </div>
                                <button
                                    className="btn btn--body !font-normal px-4 py-2 w-full sm:w-auto"
                                    type="submit"
                                    disabled={isSubmitting || details.isLockerBusy}
                                >
                                    {isSubmitting && <Spinner className="mr-2" />}
                                    Move tokens to wallet
                                </button>
                            </Form>
                        )}
                    </Formik>
                </div>

                <div className="py-5">
                    <h3 className="text-lg font-semibold">Release locked tokens</h3>
                    <p className="mb-3">
                        Release locked tokens from all completed proposals back to SMV
                        balance
                    </p>
                    <Formik
                        initialValues={{}}
                        onSubmit={onReleaseSmvTokens}
                        enableReinitialize
                    >
                        {({ isSubmitting }) => (
                            <Form>
                                <button
                                    className="btn btn--body !font-normal px-4 py-2"
                                    type="submit"
                                    disabled={isSubmitting || details.isLockerBusy}
                                >
                                    {isSubmitting && <Spinner className="mr-2" />}
                                    Release locked tokens
                                </button>
                            </Form>
                        )}
                    </Formik>
                </div>
            </div>
        </>
    )
}

export default DaoWalletPage

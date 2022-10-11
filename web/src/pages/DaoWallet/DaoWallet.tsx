import { Field, Form, Formik } from 'formik'
import { useOutletContext } from 'react-router-dom'
import TextField from '../../components/FormikForms/TextField'
import Spinner from '../../components/Spinner'
import * as Yup from 'yup'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import { EGoshError, GoshError } from 'react-gosh'
import { toast } from 'react-toastify'
import SmvBalance from '../../components/SmvBalance/SmvBalance'
import { useSmvBalance } from '../../hooks/gosh.hooks'
import ToastError from '../../components/Error/ToastError'

type TMoveBalanceFormValues = {
    amount: number
}

const DaoWalletPage = () => {
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const smvBalance = useSmvBalance(dao.adapter, dao.details.isAuthenticated)

    const onMoveBalanceToSmvBalance = async (values: TMoveBalanceFormValues) => {
        console.debug('[Move balance to SMV balance] - Values:', values)
        try {
            if (smvBalance.smvBusy) throw new GoshError(EGoshError.SMV_LOCKER_BUSY)

            // await retry(() => wallet.instance.lockVoting(values.amount), 3)
            toast.success('Submitted, balance will be updated soon')
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    const onMoveSmvBalanceToBalance = async (values: TMoveBalanceFormValues) => {
        console.debug('[Move SMV balance to balance] - Values:', values)
        try {
            if (smvBalance.smvBusy) throw new GoshError(EGoshError.SMV_LOCKER_BUSY)

            // await retry(() => wallet.instance.unlockVoting(values.amount), 3)
            toast.success('Submitted, balance will be updated soon')
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    const onReleaseSmvTokens = async () => {
        try {
            if (smvBalance.smvBusy) throw new GoshError(EGoshError.SMV_LOCKER_BUSY)

            // await retry(() => wallet.instance.updateHead(), 3)
            toast.success('Release submitted, tokens will be released soon')
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <>
            <SmvBalance details={smvBalance} dao={dao} className="mb-4 !px-0" />

            <div className="divide-y divide-gray-200">
                <div className="py-5">
                    <h3 className="text-lg font-semibold">Topup SMV balance</h3>
                    <p className="mb-3">
                        Move tokens from wallet balance to SMV balance to get an ability
                        to create new proposals and vote
                    </p>
                    <Formik
                        initialValues={{ amount: smvBalance.balance }}
                        onSubmit={onMoveBalanceToSmvBalance}
                        validationSchema={Yup.object().shape({
                            amount: Yup.number()
                                .min(1)
                                .max(smvBalance.balance)
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
                                    disabled={isSubmitting || smvBalance.smvBusy}
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
                            amount: smvBalance.smvBalance,
                        }}
                        onSubmit={onMoveSmvBalanceToBalance}
                        validationSchema={Yup.object().shape({
                            amount: Yup.number()
                                .min(1)
                                .max(smvBalance.smvBalance)
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
                                    disabled={isSubmitting || smvBalance.smvBusy}
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
                                    disabled={isSubmitting || smvBalance.smvBusy}
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

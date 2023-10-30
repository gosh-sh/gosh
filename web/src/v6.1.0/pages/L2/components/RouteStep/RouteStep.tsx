import { Form, Formik } from 'formik'
import { Button } from '../../../../../components/Form'
import { useL2Transfer } from '../../../../hooks/l2.hooks'
import yup from '../../../../yup-extended'
import { EL2Network, TL2Token, TL2User } from '../../../../types/l2.types'
import { useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { ToastError } from '../../../../../components/Toast'
import UserField from './UserField'
import Web3Connect from './Web3Connect'
import AmountField from './AmountField'
import TokenField from './TokenField'
import { fromBigint } from '../../../../../utils'

const RouteStep = () => {
    const {
        web3,
        gosh,
        summary,
        setSummaryToken,
        setSummaryUser,
        setSummaryWallet,
        setSummaryAmount,
        submitRouteStep,
    } = useL2Transfer()
    const [userFetching, setUserFetching] = useState<boolean>(false)

    const maxBalance = useMemo(() => {
        const balance =
            summary.from.token.network === EL2Network.GOSH ? gosh.balance : web3.balance
        return fromBigint(balance, summary.from.token.decimals)
    }, [summary.from.token.network, gosh.balance, web3.balance])

    const onTokenFieldChange = async (dir: 'from' | 'to', option: TL2Token) => {
        try {
            await setSummaryToken(dir, option)
        } catch (e: any) {
            toast.error(<ToastError error={e.message} />)
            console.error(e.message)
        } finally {
        }
    }

    const onUserFieldChange = async (option: TL2User) => {
        try {
            setUserFetching(true)
            await setSummaryUser(option)
        } catch (e: any) {
            toast.error(<ToastError error={e.message} />)
            console.error(e.message)
        } finally {
            setUserFetching(false)
        }
    }

    const onWalletFieldChange = async (e: any) => {
        await setSummaryWallet(e.target.value)
    }

    const onAmountFieldChange = async (e: any) => {
        await setSummaryAmount(e.target.value)
    }

    const onFormSubmit = () => {
        try {
            submitRouteStep()
        } catch (e: any) {
            console.error(e.message)
        }
    }

    return (
        <Formik
            initialValues={{
                from_token: summary.from.token,
                from_user: summary.from.user,
                from_wallet: summary.from.wallet,
                from_amount: summary.from.amount,
                to_token: summary.to.token,
                to_user: summary.to.user,
                to_wallet: summary.to.wallet,
                to_amount: summary.to.amount,
            }}
            validationSchema={yup.object().shape({
                from_token: yup.object().shape({
                    symbol: yup.string().required(),
                }),
                from_wallet: yup.string().required(),
                from_amount: yup
                    .number()
                    .min(0.01)
                    .max(parseFloat(maxBalance))
                    .required(),
                to_token: yup.object().shape({
                    symbol: yup.string().required(),
                }),
                to_wallet: yup.string().required(),
                to_amount: yup.number().positive().required(),
            })}
            onSubmit={onFormSubmit}
            enableReinitialize
        >
            {({ values, setFieldValue }) => (
                <Form>
                    <div
                        className="flex flex-wrap lg:flex-nowrap gap-x-12 gap-y-6
                            border border-gray-e6edff rounded-xl bg-gray-fafafd p-5"
                    >
                        <div className="basis-full lg:basis-2/12 text-xl font-medium">
                            From
                        </div>
                        <div className="grow">
                            <div className="flex items-end flex-nowrap gap-x-5">
                                <div className="grow">
                                    <TokenField
                                        prefix="from"
                                        label="Token"
                                        onTokenFieldChange={(option) => {
                                            onTokenFieldChange('from', option)
                                        }}
                                    />
                                </div>
                                <Web3Connect network={values.from_token.network} />
                            </div>
                            <div className="mt-5">
                                <UserField
                                    network={values.from_token?.network}
                                    user={values.from_user}
                                    wallet={values.from_wallet}
                                    prefix="from"
                                    label="Sender"
                                    disabled
                                    isUserFetching={userFetching}
                                    onFieldChange={onWalletFieldChange}
                                    onUserFieldChange={onUserFieldChange}
                                />
                            </div>
                            <div className="mt-5">
                                <AmountField
                                    token={values.from_token}
                                    prefix="from"
                                    label="Amount"
                                    onChange={onAmountFieldChange}
                                />
                            </div>
                        </div>
                        <div className="hidden lg:block self-end">
                            <div className="w-[5.625rem]">
                                <img
                                    src="/images/bridge-from.webp"
                                    alt="From blockchain"
                                />
                            </div>
                        </div>
                    </div>

                    <div
                        className="mt-5 flex flex-wrap lg:flex-nowrap gap-x-12 gap-y-6
                            border border-gray-e6edff rounded-xl bg-gray-fafafd p-5"
                    >
                        <div className="basis-full lg:basis-2/12 text-xl font-medium">
                            To
                        </div>
                        <div className="grow">
                            <div className="flex items-end flex-nowrap gap-x-5">
                                <div className="grow">
                                    <TokenField
                                        prefix="to"
                                        label="Token"
                                        onTokenFieldChange={(option) => {
                                            onTokenFieldChange('to', option)
                                        }}
                                    />
                                </div>
                                <Web3Connect network={values.to_token.network} />
                            </div>
                            <div className="mt-5">
                                <UserField
                                    network={values.to_token?.network}
                                    user={values.to_user}
                                    wallet={values.to_wallet}
                                    prefix="to"
                                    label="Receiver"
                                    isUserFetching={userFetching}
                                    onFieldChange={onWalletFieldChange}
                                    onUserFieldChange={onUserFieldChange}
                                />
                            </div>
                            <div className="mt-5">
                                <AmountField
                                    token={values.to_token}
                                    prefix="to"
                                    label="Amount"
                                    disabled
                                />
                            </div>
                        </div>
                        <div className="hidden lg:block self-end">
                            <div className="w-[5.625rem]">
                                <img src="/images/bridge-to.webp" alt="To blockchain" />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 text-end">
                        <Button type="submit" size="xl">
                            Next
                        </Button>
                    </div>
                </Form>
            )}
        </Formik>
    )
}

export { RouteStep }

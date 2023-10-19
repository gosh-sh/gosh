import { Form, Formik, FormikHelpers } from 'formik'
import { Button } from '../../../../../components/Form'
import { useL2Transfer } from '../../../../hooks/l2.hooks'
import yup from '../../../../yup-extended'
import { TL2User } from '../../../../types/l2.types'
import { useState } from 'react'
import { toast } from 'react-toastify'
import { ToastError } from '../../../../../components/Toast'
import { AppConfig } from '../../../../../appconfig'
import { GoshError } from '../../../../../errors'
import UserField from './UserField'
import Web3Connect from './Web3Connect'
import AmountField from './AmountField'
import NetworkField from './NetworkField'
import { fromBigint } from '../../../../../utils'

const RouteStep = () => {
    const { networks, summary, setSummaryFormValues, submitRouteStep } = useL2Transfer()
    const [userFetching, setUserFetching] = useState<boolean>(false)

    const onFieldChange = (
        e: any,
        setFieldValue: FormikHelpers<any>['setFieldValue'],
    ) => {
        const name = e.target.getAttribute('name')
        const value = e.target.value

        setFieldValue(name, value)
        setSummaryFormValues({ [name]: value })
    }

    const onUserFieldChange = async (
        option: TL2User,
        setFieldValue: FormikHelpers<any>['setFieldValue'],
    ) => {
        try {
            setUserFetching(true)

            if (!AppConfig.tip3root) {
                throw new GoshError('Value error', 'TIP3 root undefined')
            }

            let walletaddr = ''
            let pubkey = ''
            if (option?.value.address) {
                const profile = await AppConfig.goshroot.getUserProfile({
                    address: option.value.address,
                })
                pubkey = (await profile.getPubkeys())[0]
                const wallet = await AppConfig.tip3root.getWallet({
                    data: { pubkey },
                })
                walletaddr = wallet.address
            }

            setFieldValue('to_wallet', walletaddr)
            setSummaryFormValues({
                to_user: {
                    user: { ...option, value: { ...option.value, pubkey } },
                    wallet: walletaddr,
                },
            })
        } catch (e: any) {
            toast.error(<ToastError error={e.message} />)
            console.error(e.message)
        } finally {
            setUserFetching(false)
        }
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
                from_network: summary.from.network,
                from_user: summary.from.user,
                from_wallet: summary.from.wallet,
                from_amount: summary.from.amount,
                to_network: summary.to.network,
                to_user: summary.to.user,
                to_wallet: summary.to.wallet,
                to_amount: summary.to.amount,
            }}
            validationSchema={yup.object().shape({
                from_network: yup.string().required(),
                from_wallet: yup.string().required(),
                from_amount: yup
                    .number()
                    .min(0.01)
                    .max(
                        parseFloat(
                            fromBigint(
                                networks[summary.from.network].balance,
                                networks[summary.from.network].decimals,
                            ),
                        ),
                    )
                    .required(),
                to_network: yup.string().required(),
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
                                    <NetworkField
                                        prefix="from"
                                        label="Blockchain"
                                        onChange={(e: any) => {
                                            onFieldChange(e, setFieldValue)
                                        }}
                                    />
                                </div>
                                <Web3Connect network={values.from_network} />
                            </div>
                            <div className="mt-5">
                                <UserField
                                    network={values.from_network}
                                    user={values.from_user}
                                    wallet={values.from_wallet}
                                    prefix="from"
                                    label="Sender"
                                    disabled
                                    isUserFetching={userFetching}
                                    onFieldChange={(e) => onFieldChange(e, setFieldValue)}
                                    onUserFieldChange={(option) => {
                                        onUserFieldChange(option, setFieldValue)
                                    }}
                                />
                            </div>
                            <div className="mt-5">
                                <AmountField
                                    network={values.from_network}
                                    prefix="from"
                                    label="Amount"
                                    onChange={(e: any) => {
                                        onFieldChange(e, setFieldValue)
                                    }}
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
                                    <NetworkField
                                        prefix="to"
                                        label="Blockchain"
                                        onChange={(e: any) => {
                                            onFieldChange(e, setFieldValue)
                                        }}
                                    />
                                </div>
                                <Web3Connect network={values.to_network} />
                            </div>
                            <div className="mt-5">
                                <UserField
                                    network={values.to_network}
                                    user={values.to_user}
                                    wallet={values.to_wallet}
                                    prefix="to"
                                    label="Receiver"
                                    isUserFetching={userFetching}
                                    onFieldChange={(e) => onFieldChange(e, setFieldValue)}
                                    onUserFieldChange={(option) => {
                                        onUserFieldChange(option, setFieldValue)
                                    }}
                                />
                            </div>
                            <div className="mt-5">
                                <AmountField
                                    network={values.to_network}
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

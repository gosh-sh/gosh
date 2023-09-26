import { Field, Form, Formik, FormikHelpers } from 'formik'
import { FormikInput, FormikSelect } from '../../../../components/Formik'
import { Button } from '../../../../components/Form'
import { useBridgeTransfer } from '../../../hooks/bridge.hooks'
import yup from '../../../yup-extended'
import { EBridgeNetwork } from '../../../types/bridge.types'

const RouteStep = () => {
    const {
        web3,
        networks,
        summary,
        web3Connect,
        setSummaryFormValues,
        submitRouteStep,
    } = useBridgeTransfer()

    const getHelpBalance = (balance: number, precision: number = 4) => {
        const multiplier = 10 ** precision
        return Math.round(balance * multiplier) / multiplier
    }

    const onFieldChange = (
        e: any,
        setFieldValue: FormikHelpers<any>['setFieldValue'],
    ) => {
        const name = e.target.getAttribute('name')
        const value = e.target.value

        setFieldValue(name, value)
        setSummaryFormValues({ [name]: value })
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
                from_address: summary.from.address,
                from_amount: summary.from.amount.toString(),
                to_network: summary.to.network,
                to_address: summary.to.address,
                to_amount: summary.to.amount.toString(),
            }}
            validationSchema={yup.object().shape({
                from_network: yup.string().required(),
                from_address: yup.string().required(),
                from_amount: yup
                    .number()
                    .min(1 / 10 ** 18)
                    .max(networks[summary.from.network].balance)
                    .required(),
                to_network: yup.string().required(),
                to_address: yup.string().required(),
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
                                    <Field
                                        label="Blockchain"
                                        name="from_network"
                                        type="select"
                                        component={FormikSelect}
                                        className="bg-white"
                                        onChange={(e: any) => {
                                            onFieldChange(e, setFieldValue)
                                        }}
                                    >
                                        {Object.entries(networks).map((value) => (
                                            <option key={value[0]} value={value[0]}>
                                                {value[1].label}
                                            </option>
                                        ))}
                                    </Field>
                                </div>
                                {values.from_network === EBridgeNetwork.ETH &&
                                    !web3.instance && (
                                        <div>
                                            <Button type="button" onClick={web3Connect}>
                                                Connect wallet
                                            </Button>
                                        </div>
                                    )}
                            </div>
                            <div className="mt-5">
                                <Field
                                    label="Sender address"
                                    name="from_address"
                                    component={FormikInput}
                                    className="bg-white"
                                    autoComplete="off"
                                    readOnly
                                    disabled
                                />
                            </div>
                            <div className="mt-5">
                                <Field
                                    label="Amount"
                                    name="from_amount"
                                    component={FormikInput}
                                    className="bg-white"
                                    autoComplete="off"
                                    inputProps={{
                                        after: (
                                            <div className="text-xs text-gray-7c8db5 pr-3 py-2.5">
                                                {networks[summary.from.network].token}
                                            </div>
                                        ),
                                    }}
                                    help={
                                        <>
                                            Balance{' '}
                                            {getHelpBalance(
                                                networks[values.from_network].balance,
                                            )}
                                        </>
                                    }
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
                            <div>
                                <Field
                                    label="Blockchain"
                                    name="to_network"
                                    type="select"
                                    component={FormikSelect}
                                    className="bg-white"
                                    onChange={(e: any) => {
                                        onFieldChange(e, setFieldValue)
                                    }}
                                >
                                    {Object.entries(networks).map((value) => (
                                        <option
                                            key={value[0]}
                                            value={value[0]}
                                            disabled={value[0] === values.from_network}
                                        >
                                            {value[1].label}
                                        </option>
                                    ))}
                                </Field>
                            </div>
                            <div className="mt-5">
                                <Field
                                    label="Receiver address"
                                    name="to_address"
                                    component={FormikInput}
                                    autoComplete="off"
                                    className="bg-white"
                                    onChange={(e: any) => {
                                        onFieldChange(e, setFieldValue)
                                    }}
                                />
                            </div>
                            <div className="mt-5">
                                <Field
                                    label="Amount"
                                    name="to_amount"
                                    component={FormikInput}
                                    className="bg-white"
                                    autoComplete="off"
                                    readOnly
                                    disabled
                                    inputProps={{
                                        after: (
                                            <div className="text-xs text-gray-7c8db5 pr-3 py-2.5">
                                                {networks[summary.to.network].token}
                                            </div>
                                        ),
                                    }}
                                    help={
                                        <>
                                            Balance{' '}
                                            {getHelpBalance(
                                                networks[values.to_network].balance,
                                            )}
                                        </>
                                    }
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

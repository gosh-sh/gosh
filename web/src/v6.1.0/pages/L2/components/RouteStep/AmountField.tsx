import { Field } from 'formik'
import { FormikInput } from '../../../../../components/Formik'
import { useL2Transfer } from '../../../../hooks/l2.hooks'
import { Button } from '../../../../../components/Form'
import classNames from 'classnames'
import { fromBigint, roundNumber } from '../../../../../utils'

type TAmountFieldProps = {
    network: string
    prefix: string
    label?: string
    disabled?: boolean
    onChange?(e: any): void
}

const AmountField = (props: TAmountFieldProps) => {
    const { network, prefix, label, disabled, onChange } = props
    const { networks, setSummaryFormValues } = useL2Transfer()

    const getNetworkBalance = (network: string) => {
        const floatstr = fromBigint(networks[network].balance, networks[network].decimals)
        return roundNumber(floatstr, 5)
    }

    const onMaxClick = () => {
        setSummaryFormValues({
            from_amount: fromBigint(
                networks[network].balance,
                networks[network].decimals,
            ),
        })
    }

    return (
        <Field
            label={label}
            name={`${prefix}_amount`}
            component={FormikInput}
            className="bg-white"
            autoComplete="off"
            readOnly={disabled}
            disabled={disabled}
            inputProps={{
                after: (
                    <div className="text-xs text-gray-7c8db5 pr-3 py-2.5">
                        {networks[network].token}
                    </div>
                ),
            }}
            help={
                <div className="flex flex-nowrap items-center justify-between gap-6">
                    <div className={classNames(prefix === 'from' ? 'block' : 'hidden')}>
                        Balance {getNetworkBalance(network)}
                    </div>
                    <div className={classNames(prefix === 'from' ? 'block' : 'hidden')}>
                        <Button
                            type="button"
                            variant="outline-secondary"
                            size="sm"
                            onClick={onMaxClick}
                        >
                            Max
                        </Button>
                    </div>
                </div>
            }
            onChange={onChange}
        />
    )
}

export default AmountField

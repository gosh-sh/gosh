import { Field } from 'formik'
import { FormikInput } from '../../../../../components/Formik'
import { useL2Transfer } from '../../../../hooks/l2.hooks'
import { Button } from '../../../../../components/Form'
import classNames from 'classnames'
import { fromBigint, roundNumber } from '../../../../../utils'
import { useMemo, useRef } from 'react'
import { EL2Network, TL2Token } from '../../../../types/l2.types'

type TAmountFieldProps = {
    token: TL2Token
    prefix: string
    label?: string
    disabled?: boolean
    onChange?(e: any): void
}

const AmountField = (props: TAmountFieldProps) => {
    const { token, prefix, label, disabled, onChange } = props
    const { web3, gosh } = useL2Transfer()
    const ref = useRef<HTMLInputElement>(null)

    const balance = useMemo(() => {
        const balance = token.network === EL2Network.GOSH ? gosh.balance : web3.balance
        return fromBigint(balance, token.decimals)
    }, [token.network, gosh.balance, web3.balance])

    const onMaxClick = () => {
        if (!ref.current) {
            return
        }

        ref.current.value = balance
        onChange && onChange({ target: ref.current })
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
                ref: ref,
                after: (
                    <div className="text-xs text-gray-7c8db5 pr-3 py-2.5">
                        {token.symbol}
                    </div>
                ),
            }}
            help={
                <div className="flex flex-nowrap items-center justify-between gap-6">
                    <div className={classNames(prefix === 'from' ? 'block' : 'hidden')}>
                        Balance {roundNumber(balance, 5)}
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

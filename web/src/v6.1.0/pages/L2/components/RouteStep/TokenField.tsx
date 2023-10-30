import Select from 'react-select'
import { Field } from 'formik'
import { BaseField } from '../../../../../components/Formik'
import { useL2Transfer } from '../../../../hooks/l2.hooks'
import { Select2ClassNames } from '../../../../../helpers'
import { TL2Token } from '../../../../types/l2.types'
import { l2Tokens } from '../../../../store/l2.state'

type TTokenFieldProps = {
    prefix: string
    label?: string
    onTokenFieldChange(option: TL2Token): void
}

const TokenField = (props: TTokenFieldProps) => {
    const { prefix, label, onTokenFieldChange } = props
    const { summary } = useL2Transfer()

    const getSelectedOption = (symbol: string) => {
        const found = l2Tokens.find((token) => token.symbol === symbol)
        return found
            ? { value: found.symbol, data: found, disabled: false }
            : { value: '', data: null, disabled: false }
    }

    const getOptions = () => {
        const from = getSelectedOption(summary.from.token.symbol)
        return l2Tokens.map((token) => ({
            value: token.symbol,
            data: token,
            disabled: prefix === 'to' && token.pair.indexOf(from.value) < 0,
        }))
    }

    return (
        <Field label={label} type="select" name={`${prefix}_token`} component={BaseField}>
            {(params: any) => {
                const selected = getSelectedOption(params.field.value.symbol)

                return (
                    <Select
                        classNames={Select2ClassNames}
                        placeholder="Token"
                        value={selected}
                        options={getOptions()}
                        isOptionDisabled={(option) => !!option?.disabled}
                        isOptionSelected={(option) => option.value === selected.value}
                        formatOptionLabel={(option) => {
                            const { data } = option
                            return (
                                <div className="flex flex-nowrap items-center gap-x-3">
                                    <div className="w-6">
                                        <img
                                            src={data?.iconpath}
                                            alt="Icon"
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        {data?.symbol}
                                        <span className="ml-1 text-xs text-gray-7c8db5 uppercase">
                                            {data?.network}
                                        </span>
                                    </div>
                                </div>
                            )
                        }}
                        onChange={(option) => {
                            option?.data && onTokenFieldChange(option.data as TL2Token)
                        }}
                    />
                )
            }}
        </Field>
    )
}

export default TokenField

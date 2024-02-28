import { Field } from 'formik'
import Select from 'react-select'
import { BaseField } from '../../../../../components/Formik'
import { Select2ClassNames } from '../../../../../helpers'
import { useL2Transfer } from '../../../../hooks/l2.hooks'
import { l2Tokens } from '../../../../store/l2.state'
import { TL2Token } from '../../../../types/l2.types'

type TTokenFieldProps = {
  prefix: string
  label?: string
  onTokenFieldChange(option: TL2Token): void
}

const TokenField = (props: TTokenFieldProps) => {
  const { prefix, label, onTokenFieldChange } = props
  const { summary } = useL2Transfer()

  const getSelectedOption = (pair_name: string) => {
    const found = l2Tokens.find((token) => token.pair_name === pair_name)
    return found
      ? { value: found.pair_name, data: found, disabled: false }
      : { value: '', data: null, disabled: false }
  }

  const getOptions = () => {
    const from = getSelectedOption(summary.from.token.pair_name)
    return l2Tokens.map((token) => ({
      value: token.pair_name,
      data: token,
      disabled: prefix === 'to' && token.pair_with.indexOf(from.value) < 0,
    }))
  }

  return (
    <Field label={label} type="select" name={`${prefix}_token`} component={BaseField}>
      {(params: any) => {
        const selected = getSelectedOption(params.field.value.pair_name)

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
                    <img src={data?.iconpath} alt="Icon" className="w-full" />
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

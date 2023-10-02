import { Field } from 'formik'
import { FormikSelect } from '../../../../../components/Formik'
import { useL2Transfer } from '../../../../hooks/l2.hooks'

type TNetworkFieldProps = {
    prefix: string
    label?: string
    onChange?(e: any): void
}

const NetworkField = (props: TNetworkFieldProps) => {
    const { prefix, label, onChange } = props
    const { networks } = useL2Transfer()

    return (
        <Field
            label={label}
            name={`${prefix}_network`}
            type="select"
            component={FormikSelect}
            className="bg-white"
            onChange={onChange}
        >
            {Object.entries(networks).map((value) => (
                <option key={value[0]} value={value[0]}>
                    {value[1].label}
                </option>
            ))}
        </Field>
    )
}

export default NetworkField

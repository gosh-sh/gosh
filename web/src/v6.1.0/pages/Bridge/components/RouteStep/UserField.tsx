import { ErrorMessage, Field } from 'formik'
import { EBridgeNetwork, TBridgeUser } from '../../../../types/bridge.types'
import { BaseField, FormikInput } from '../../../../../components/Formik'
import { shortString } from '../../../../../utils'
import { UserSelect } from '../../../../components/UserSelect'

type TUserFieldProps = {
    network: string
    user: TBridgeUser | null
    wallet: string
    prefix: string
    label?: string
    disabled?: boolean
    isUserFetching?: boolean
    onFieldChange(e: any): void
    onUserFieldChange(option: TBridgeUser): void
}

const UserField = (props: TUserFieldProps) => {
    const {
        network,
        user,
        wallet,
        prefix,
        label,
        disabled,
        isUserFetching,
        onFieldChange,
        onUserFieldChange,
    } = props

    if (network !== EBridgeNetwork.GOSH) {
        return (
            <Field
                label={label}
                name={`${prefix}_wallet`}
                component={FormikInput}
                autoComplete="off"
                className="bg-white"
                readOnly={disabled}
                disabled={disabled}
                onChange={onFieldChange}
            />
        )
    }

    return (
        <>
            <Field type="hidden" name="to_wallet" />
            <Field
                label={label}
                name={`${prefix}_user`}
                component={BaseField}
                help={shortString(wallet, 8, 8)}
            >
                <UserSelect
                    placeholder="Username"
                    value={user}
                    isDisabled={disabled || isUserFetching}
                    onChange={onUserFieldChange}
                />
            </Field>
            <ErrorMessage
                className="text-xs text-red-ff3b30 mt-0.5 px-1"
                component="div"
                name={`${prefix}_wallet`}
            />
        </>
    )
}

export default UserField

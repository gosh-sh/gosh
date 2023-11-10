import { ErrorMessage, Field } from 'formik'
import { BaseField, FormikInput } from '../../../../../components/Formik'
import { shortString } from '../../../../../utils'
import { UserSelect } from '../../../../components/UserSelect'
import { EL2Network, TL2User } from '../../../../types/l2.types'

type TUserFieldProps = {
    network?: string
    user: TL2User | null
    wallet: string
    prefix: string
    label?: string
    disabled?: boolean
    isUserFetching?: boolean
    onFieldChange(e: any): void
    onUserFieldChange(option: TL2User): void
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

    if (network !== EL2Network.GOSH) {
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
            <Field type="hidden" name={`${prefix}_wallet`} />
            <Field
                label={label}
                name={`${prefix}_user`}
                component={BaseField}
                help={shortString(wallet, 8, 8)}
            >
                <UserSelect
                    placeholder="Username"
                    value={user}
                    isClearable={false}
                    isDisabled={disabled || isUserFetching}
                    noOptionsMessage={({ inputValue }) => (
                        <span className="text-gray-7c8db5">
                            {!inputValue.length
                                ? 'Input GOSH username'
                                : 'Username not found'}
                        </span>
                    )}
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

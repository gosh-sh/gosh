import CopyClipboard from '../../../../../components/CopyClipboard'
import { shortString, TDaoMemberDetails, TUserParam } from 'react-gosh'
import Spinner from '../../../../../components/Spinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { Field } from 'formik'
import { FormikInput } from '../../../../../components/Formik'

type TMemberListItemProps = {
    index: number
    item: TDaoMemberDetails
    owner: string
    isAuthMember: boolean
    isFetching: boolean
    onDelete(user: TUserParam): Promise<void>
}

const DaoMemberListItem = (props: TMemberListItemProps) => {
    const { index, item, owner, isAuthMember, isFetching, onDelete } = props

    return (
        <tr>
            <td className="px-3 py-2">
                <div>{item.user.name}</div>
                <small className="text-xs text-gray-7c8db5">{item.user.type}</small>
            </td>
            <td className="px-3 py-2 text-gray-7c8db5 font-light text-sm">
                {item.profile && (
                    <CopyClipboard
                        componentProps={{ text: item.profile }}
                        label={shortString(item.profile, 6, 6)}
                    />
                )}
            </td>
            <td className="px-3 py-2 text-gray-7c8db5 font-light">
                {isAuthMember ? (
                    <>
                        <Field
                            type="hidden"
                            name={`items.${index}._allowance`}
                            component="input"
                            autoComplete="off"
                        />
                        <Field
                            name={`items.${index}.allowance`}
                            component={FormikInput}
                            autoComplete="off"
                            placeholder="New karma value"
                        />
                    </>
                ) : (
                    item.allowance
                )}
            </td>
            <td className="px-3 py-2 text-gray-7c8db5 font-light">
                {isAuthMember ? (
                    <>
                        <Field
                            type="hidden"
                            name={`items.${index}._balance`}
                            component="input"
                            autoComplete="off"
                        />
                        <Field
                            name={`items.${index}.balance`}
                            component={FormikInput}
                            autoComplete="off"
                            placeholder="New balance value"
                        />
                    </>
                ) : (
                    item.balance
                )}
            </td>
            <td className="px-3 py-2 text-gray-7c8db5 font-light text-right">
                {isAuthMember && (
                    <button
                        type="button"
                        className="hover:text-gray-53596d disabled:opacity-20 disabled:pointer-events-none"
                        onClick={() => onDelete(item.user)}
                        disabled={isFetching || item.profile === owner}
                    >
                        {isFetching ? (
                            <Spinner size="xs" />
                        ) : (
                            <FontAwesomeIcon icon={faTimes} size="lg" />
                        )}
                    </button>
                )}
            </td>
        </tr>
    )
}

export default DaoMemberListItem

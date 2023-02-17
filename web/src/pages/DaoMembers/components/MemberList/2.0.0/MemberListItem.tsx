import CopyClipboard from '../../../../../components/CopyClipboard'
import { shortString, TDaoMemberDetails } from 'react-gosh'
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
    onDelete(username: string): Promise<void>
}

const DaoMemberListItem = (props: TMemberListItemProps) => {
    const { index, item, owner, isAuthMember, isFetching, onDelete } = props

    return (
        <tr>
            <td className="px-3 py-2">{item.name}</td>
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
                            placeholder="New allowance value"
                        />
                    </>
                ) : (
                    item.allowance
                )}
            </td>
            <td className="px-3 py-2 text-gray-7c8db5 font-light text-sm">
                {item.profile && (
                    <CopyClipboard
                        componentProps={{ text: item.profile }}
                        label={shortString(item.profile, 6, 6)}
                    />
                )}
            </td>
            <td className="px-3 py-2 text-gray-7c8db5 font-light text-sm">
                <CopyClipboard
                    componentProps={{ text: item.wallet }}
                    label={shortString(item.wallet, 6, 6)}
                />
            </td>
            <td className="px-3 py-2 text-gray-7c8db5 font-light text-right">
                {isAuthMember && (
                    <button
                        type="button"
                        className="hover:text-gray-53596d disabled:opacity-20 disabled:pointer-events-none"
                        onClick={() => onDelete(item.name)}
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

import CopyClipboard from '../../../../../components/CopyClipboard'
import { shortString, TDaoMemberDetails, TUserParam } from 'react-gosh'
import Spinner from '../../../../../components/Spinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { Field } from 'formik'
import { FormikInput } from '../../../../../components/Formik'
import { faQuestionCircle } from '@fortawesome/free-regular-svg-icons'
import { Tooltip } from 'react-tooltip'
import { Link } from 'react-router-dom'

type TMemberListItemProps = {
    daoName: string
    index: number
    item: TDaoMemberDetails
    owner: string
    isAuthMember: boolean
    isFetching: boolean
    onDelete(user: {
        user: TUserParam
        allowance: number
        profile: string
    }): Promise<void>
}

const DaoMemberListItem = (props: TMemberListItemProps) => {
    const { daoName, index, item, owner, isAuthMember, isFetching, onDelete } = props

    return (
        <>
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
                <td className="px-3 py-2 text-gray-7c8db5 font-light text-sm">
                    {item.wallet && (
                        <CopyClipboard
                            componentProps={{ text: item.wallet }}
                            label={shortString(item.wallet, 6, 6)}
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
                                inputProps={{
                                    after: item.balancePrev ? (
                                        <div
                                            className="text-xs text-red-dd3a3a py-2 pr-3"
                                            data-tooltip-id={`member-balance-tip-${item.user.type}`}
                                        >
                                            +{item.balancePrev}
                                            <FontAwesomeIcon
                                                icon={faQuestionCircle}
                                                className="ml-1"
                                            />
                                        </div>
                                    ) : null,
                                }}
                            />
                            <Tooltip
                                id={`member-balance-tip-${item.user.type}`}
                                clickable
                            >
                                <div>Untransferred tokens from previous version</div>
                                {item.user.type === 'user' && (
                                    <div>
                                        <Link to={`/o/${daoName}`} className="underline">
                                            Transfer
                                        </Link>
                                    </div>
                                )}
                            </Tooltip>
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
                            onClick={() =>
                                onDelete({
                                    user: item.user,
                                    allowance: item.allowance || 0,
                                    profile: item.profile,
                                })
                            }
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
        </>
    )
}

export default DaoMemberListItem

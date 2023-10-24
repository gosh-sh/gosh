import CopyClipboard from '../../../../../components/CopyClipboard'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { EDaoMemberType, TDaoMemberListItem } from '../../../../types/dao.types'
import { shortString } from '../../../../../utils'
import Skeleton from '../../../../../components/Skeleton'
import { useDao, useDeleteDaoMember, useDaoMember } from '../../../../hooks/dao.hooks'
import { useNavigate } from 'react-router-dom'
import { ErrorMessage, Field } from 'formik'
import { FormikInput } from '../../../../../components/Formik'
import classNames from 'classnames'
import { Button } from '../../../../../components/Form'
import { MemberIcon } from '../../../../../components/Dao'
import { faQuestionCircle } from '@fortawesome/free-regular-svg-icons'
import { Tooltip } from 'react-tooltip'

const basis = {
    contaner: 'flex items-center flex-wrap xl:flex-nowrap px-3 py-2 gap-x-6 gap-y-2',
    name: 'basis-full lg:basis-full xl:!basis-2/12',
    profile: 'basis-5/12 md:basis-5/12 lg:!basis-[11.7%]',
    wallet: 'basis-5/12 md:basis-5/12 lg:!basis-[11.7%]',
    allowance: 'basis-full md:basis-5/12 lg:!basis-2/12',
    balance: 'basis-full md:basis-5/12 lg:!basis-2/12',
    vesting: 'basis-full md:basis-5/12 lg:!basis-2/12 xl:!basis-1/12',
    buttons: 'basis-full md:basis-5/12 lg:!basis-0 grow',
}

const ListItemSkeleton = () => {
    return (
        <div className="flex px-5 py-2 gap-x-4">
            {Array.from(new Array(6)).map((_, i) => (
                <div key={i} className={classNames(i === 0 ? basis.name : basis.buttons)}>
                    <Skeleton className="py-2" skeleton={{ height: 10 }}>
                        <rect x="0" y="0" rx="6" ry="6" width="100%" height="10" />
                    </Skeleton>
                </div>
            ))}
        </div>
    )
}

const ListItemHeader = (props: React.HTMLAttributes<HTMLDivElement>) => {
    const { className } = props

    return (
        <div
            className={classNames(
                basis.contaner,
                'text-xs text-gray-7c8db5 hidden lg:flex',
                className,
            )}
        >
            <div className={basis.name}>name</div>
            <div className={basis.profile}>profile</div>
            <div className={basis.wallet}>wallet</div>
            <div className={basis.allowance}>karma</div>
            <div className={classNames(basis.balance, 'whitespace-nowrap')}>
                token balance
            </div>
            <div className={classNames(basis.vesting, 'whitespace-nowrap')}>vesting</div>
            <div className={basis.buttons}></div>
        </div>
    )
}

type TListItemProps = {
    item: TDaoMemberListItem
    index: number
}

const ListItem = (props: TListItemProps) => {
    const { item, index } = props
    const navigate = useNavigate()
    const dao = useDao()
    const member = useDaoMember()
    const { deleteMember } = useDeleteDaoMember()

    const onDelete = async (user: { username: string; usertype: EDaoMemberType }) => {
        if (window.confirm('Delete member?')) {
            try {
                const { eventaddr } = await deleteMember([user])
                navigate(`/o/${dao.details.name}/events/${eventaddr || ''}`)
            } catch (e: any) {
                console.error(e.message)
            }
        }
    }

    return (
        <div className={classNames(basis.contaner)}>
            <div
                className={classNames(
                    basis.name,
                    'overflow-hidden whitespace-nowrap text-ellipsis',
                )}
            >
                <MemberIcon type={item.usertype} className="mr-2" size="sm" fixedWidth />
                {item.username}
            </div>
            <div className={basis.profile}>
                <CopyClipboard
                    className="font-light text-sm"
                    componentProps={{ text: item.profile.address }}
                    label={
                        <>
                            <span className="mr-2 lg:hidden">Profile:</span>
                            <span className="font-mono text-xs">
                                {shortString(item.profile.address, 5, 4)}
                            </span>
                        </>
                    }
                />
            </div>
            <div className={basis.wallet}>
                <CopyClipboard
                    className="font-light text-sm"
                    componentProps={{ text: item.wallet.address }}
                    label={
                        <>
                            <span className="mr-2 lg:hidden">Wallet:</span>
                            <span className="font-mono text-xs">
                                {shortString(item.wallet.address, 5, 4)}
                            </span>
                        </>
                    }
                />
            </div>
            <div className={classNames(basis.allowance, 'font-light')}>
                {member.isMember ? (
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
                            inputProps={{
                                after: (
                                    <div className="text-xs text-gray-7c8db5 pr-3 lg:hidden">
                                        <div className="whitespace-nowrap leading-5 py-2">
                                            Karma
                                        </div>
                                    </div>
                                ),
                            }}
                        />
                        <ErrorMessage
                            className="text-xs text-red-ff3b30 mt-0.5"
                            component="div"
                            name={`items.${index}.allowance`}
                        />
                    </>
                ) : (
                    item.allowance.toLocaleString()
                )}
            </div>
            <div className={classNames(basis.balance, 'font-light')}>
                {member.isMember ? (
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
                                after: (
                                    <div className="flex flex-nowrap items-center text-xs text-gray-7c8db5 pr-3 lg:hidden">
                                        <div className="whitespace-nowrap leading-5 py-2">
                                            Balance
                                        </div>
                                        {item.allowance > item.balance && (
                                            <div
                                                className="text-xs text-red-dd3a3a py-2.5"
                                                data-tooltip-id={`member-balance-tip-${item.profile}`}
                                            >
                                                <FontAwesomeIcon
                                                    icon={faQuestionCircle}
                                                    className="ml-1"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ),
                            }}
                        />
                        <ErrorMessage
                            className="text-xs text-red-ff3b30 mt-0.5"
                            component="div"
                            name={`items.${index}.balance`}
                        />
                        <Tooltip id={`member-balance-tip-${item.profile}`} clickable>
                            <div>
                                Member might have untransferred tokens from previous DAO
                                versions
                            </div>
                        </Tooltip>
                    </>
                ) : (
                    item.balance.toLocaleString()
                )}
            </div>
            <div className={classNames(basis.vesting, 'font-light text-sm')}>
                <span className="mr-2 lg:hidden">Vesting:</span>
                {item.vesting ? item.vesting.toLocaleString() : 0}
            </div>
            <div className={classNames(basis.buttons, 'text-end')}>
                {member.isMember && (
                    <Button
                        type="button"
                        variant="outline-danger"
                        className={classNames(
                            'w-full md:w-auto lg:!border-transparent lg:disabled:!border-transparent',
                        )}
                        onClick={() => {
                            onDelete({
                                username: item.username,
                                usertype: item.usertype,
                            })
                        }}
                        disabled={
                            item.isFetching || item.profile.address === dao.details.owner
                        }
                        isLoading={item.isFetching}
                    >
                        <FontAwesomeIcon icon={faTimes} size="lg" />
                        <span className="ml-2 lg:hidden">Delete member</span>
                    </Button>
                )}
            </div>
        </div>
    )
}

export { ListItem, ListItemSkeleton, ListItemHeader }

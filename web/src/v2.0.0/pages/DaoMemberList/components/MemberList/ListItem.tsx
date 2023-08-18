import CopyClipboard from '../../../../../components/CopyClipboard'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { TDaoMemberListItem } from '../../../../types/dao.types'
import { shortString } from '../../../../../utils'
import Skeleton from '../../../../../components/Skeleton'
import { useDao, useDeleteDaoMember, useDaoMember } from '../../../../hooks/dao.hooks'
import { useNavigate } from 'react-router-dom'
import { ToastStatus } from '../../../../../components/Toast'
import { ErrorMessage, Field } from 'formik'
import { FormikInput } from '../../../../../components/Formik'
import classNames from 'classnames'
import { Button } from '../../../../../components/Form'
import { MemberIcon } from '../../../../../components/Dao'

const basis = {
    contaner: 'flex-wrap lg:flex-nowrap',
    name: 'basis-full lg:basis-3/12 grow-0',
    profile: 'basis-0 grow lg:basis-2/12 lg:grow-0',
    wallet: 'basis-0 grow lg:basis-2/12 lg:grow-0',
    allowance: 'basis-0 grow lg:basis-2/12 lg:grow-0',
    balance: 'basis-0 grow lg:basis-2/12 lg:grow-0',
    buttons: 'basis-full md:basis-0 md:grow-0',
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
                'flex items-center px-3 py-3 gap-x-4',
                'text-xs text-gray-7c8db5',
                className,
            )}
        >
            <div className="basis-auto md:grow lg:basis-3/12 lg:grow-0">name</div>
            <div className={basis.profile}>profile</div>
            <div className={basis.wallet}>wallet</div>
            <div className={basis.allowance}>karma</div>
            <div className={classNames(basis.balance, 'whitespace-nowrap')}>
                token balance
            </div>
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
    const { status, deleteMember } = useDeleteDaoMember()

    const onDelete = async (username: string) => {
        if (window.confirm('Delete member?')) {
            try {
                await deleteMember([username])
                navigate(`/o/${dao.details.name}/events`)
            } catch (e: any) {
                console.error(e.message)
            }
        }
    }

    return (
        <>
            <div
                className={classNames(
                    'flex items-center px-3 py-2 gap-x-4 gap-y-2',
                    basis.contaner,
                )}
            >
                <div className={basis.name}>
                    <MemberIcon type="user" className="mr-2" size="sm" fixedWidth />
                    {item.username}
                </div>
                <div className={basis.profile}>
                    <CopyClipboard
                        className="font-light font-mono text-xs"
                        componentProps={{ text: item.profile.address }}
                        label={shortString(item.profile.address, 6, 6)}
                    />
                </div>
                <div className={basis.wallet}>
                    <CopyClipboard
                        className="font-light font-mono text-xs"
                        componentProps={{ text: item.wallet.address }}
                        label={shortString(item.wallet.address, 6, 6)}
                    />
                </div>
                <div className={classNames(basis.allowance, 'font-light')}>
                    {member.details.isMember ? (
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
                                        <div className="text-xs text-gray-7c8db5 pr-3 md:hidden">
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
                    {member.details.isMember ? (
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
                                        <div className="text-xs text-gray-7c8db5 pr-3 md:hidden">
                                            <div className="whitespace-nowrap leading-5 py-2">
                                                Balance
                                            </div>
                                        </div>
                                    ),
                                }}
                            />
                            <ErrorMessage
                                className="text-xs text-red-ff3b30 mt-0.5"
                                component="div"
                                name={`items.${index}.balance`}
                            />
                        </>
                    ) : (
                        item.balance.toLocaleString()
                    )}
                </div>
                <div className={basis.buttons}>
                    {member.details.isMember && (
                        <Button
                            type="button"
                            variant="outline-danger"
                            size="sm"
                            className={classNames(
                                'w-full md:w-auto md:!border-transparent md:disabled:!border-transparent',
                            )}
                            onClick={() => onDelete(item.username)}
                            disabled={
                                item.isFetching ||
                                item.profile.address === dao.details.owner
                            }
                            isLoading={item.isFetching}
                        >
                            <FontAwesomeIcon icon={faTimes} size="lg" />
                            <span className="ml-2 md:hidden">Delete member</span>
                        </Button>
                    )}
                </div>
            </div>

            <ToastStatus status={status} />
        </>
    )
}

export { ListItem, ListItemSkeleton, ListItemHeader }

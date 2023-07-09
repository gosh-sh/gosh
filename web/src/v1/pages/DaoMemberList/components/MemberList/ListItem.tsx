import CopyClipboard from '../../../../../components/CopyClipboard'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { TDaoMemberListItem } from '../../../../types/dao.types'
import { shortString } from '../../../../../utils'
import Skeleton from '../../../../../components/Skeleton'
import { useDao, useDaoDeleteMemeber, useDaoMember } from '../../../../hooks/dao.hooks'
import { useNavigate } from 'react-router-dom'
import { ToastStatus } from '../../../../../components/Toast'
import classNames from 'classnames'
import { MemberIcon } from '../../../../../components/Dao'
import { Button } from '../../../../../components/Form'

const basis = {
    contaner: 'flex-wrap justify-between lg:flex-nowrap',
    name: 'basis-full lg:basis-4/12 grow-0',
    profile: 'basis-0 grow lg:basis-2/12 lg:grow-0',
    wallet: 'basis-0 grow lg:basis-2/12 lg:grow-0',
    allowance: 'basis-0 grow',
    buttons: 'basis-full md:basis-0 md:grow-0',
}

const ListItemSkeleton = () => {
    return (
        <div className="flex px-3 py-2 gap-x-4">
            {Array.from(new Array(5)).map((_, i) => (
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
                'flex items-center justify-between px-3 py-3 gap-x-4',
                'text-xs text-gray-7c8db5',
                className,
            )}
        >
            <div className="basis-auto md:grow lg:basis-4/12 lg:grow-0">name</div>
            <div className={basis.profile}>profile</div>
            <div className={basis.wallet}>wallet</div>
            <div className={basis.allowance}>karma</div>
            <div className={basis.buttons}></div>
        </div>
    )
}

type TListItemProps = {
    item: TDaoMemberListItem
}

const ListItem = (props: TListItemProps) => {
    const { item } = props
    const navigate = useNavigate()
    const dao = useDao()
    const member = useDaoMember()
    const { status, deleteMember } = useDaoDeleteMemeber()

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
                <div className={basis.allowance}>{item.allowance.toLocaleString()}</div>
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

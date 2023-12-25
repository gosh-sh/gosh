import CopyClipboard from '../../../../../components/CopyClipboard'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { TDaoMemberListItem } from '../../../../types/dao.types'
import { shortString } from '../../../../../utils'
import Skeleton from '../../../../../components/Skeleton'
import { useDao, useDeleteDaoMember, useDaoMember } from '../../../../hooks/dao.hooks'
import { useNavigate } from 'react-router-dom'
import classNames from 'classnames'
import { MemberIcon } from '../../../../../components/Dao'
import { Button } from '../../../../../components/Form'

const basis = {
  contaner: 'flex items-center flex-wrap xl:flex-nowrap px-3 py-2 gap-x-6 gap-y-2',
  name: 'basis-full lg:!basis-3/12',
  profile: 'basis-5/12 md:basis-4/12 lg:!basis-[11.7%]',
  wallet: 'basis-5/12 md:basis-4/12 lg:!basis-[11.7%]',
  allowance: 'basis-full md:basis-4/12 lg:!basis-2/12',
  balance: 'basis-full md:basis-4/12 lg:!basis-2/12',
  buttons: 'basis-full md:basis-0 grow',
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
    <div className={classNames(basis.contaner, 'text-xs text-gray-7c8db5', className)}>
      <div className={classNames('!basis-auto', basis.name)}>name</div>
      <div className={classNames('!basis-auto', basis.profile)}>profile</div>
      <div className={classNames('!basis-auto', basis.wallet)}>wallet</div>
      <div className={classNames('!basis-auto', basis.allowance)}>karma</div>
      <div className={classNames('!basis-auto', basis.balance, 'whitespace-nowrap')}>
        token balance
      </div>
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
  const { deleteMember } = useDeleteDaoMember()

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
    <div className={classNames(basis.contaner)}>
      <div
        className={classNames(
          basis.name,
          'overflow-hidden whitespace-nowrap text-ellipsis',
        )}
      >
        <MemberIcon type="user" className="mr-2" size="sm" fixedWidth />
        {item.username}
      </div>
      <div className={basis.profile}>
        <CopyClipboard
          className="font-light font-mono text-xs"
          componentProps={{ text: item.profile.address }}
          label={shortString(item.profile.address, 5, 4)}
        />
      </div>
      <div className={basis.wallet}>
        <CopyClipboard
          className="font-light font-mono text-xs"
          componentProps={{ text: item.wallet.address }}
          label={shortString(item.wallet.address, 5, 4)}
        />
      </div>
      <div className={basis.allowance}>{item.allowance.toLocaleString()}</div>
      <div className={basis.balance}>{item.allowance.toLocaleString()}</div>
      <div className={classNames(basis.buttons, 'text-end')}>
        {member.isMember && (
          <Button
            type="button"
            variant="outline-danger"
            className={classNames(
              'w-full md:w-auto lg:!border-transparent lg:disabled:!border-transparent',
            )}
            onClick={() => onDelete(item.username)}
            disabled={item.isFetching || item.profile.address === dao.details.owner}
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

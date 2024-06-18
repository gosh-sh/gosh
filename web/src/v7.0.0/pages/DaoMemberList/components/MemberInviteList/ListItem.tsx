import CopyClipboard from '../../../../../components/CopyClipboard'
import { EDaoInviteStatus, TDaoInviteListItem } from '../../../../types/dao.types'
import { shortString } from '../../../../../utils'
import Skeleton from '../../../../../components/Skeleton'
import { useDao, useDaoInviteList } from '../../../../hooks/dao.hooks'
import { ToastError } from '../../../../../components/Toast'
import { Button } from '../../../../../components/Form'
import classNames from 'classnames'
import { toast } from 'react-toastify'

const basis = {
  contaner: 'flex-wrap md:flex-nowrap',
  token: 'basis-full md:basis-4/12 xl:basis-6/12 grow-0',
  allowance: 'basis-0 grow md:basis-2/12 md:grow-0',
  status: 'grow',
  buttons: 'basis-full md:basis-auto md:shrink',
}

const ListItemSkeleton = () => {
  return (
    <div className="flex py-2 gap-x-4">
      {Array.from(new Array(4)).map((_, i) => (
        <div key={i} className={classNames(i === 0 ? basis.token : basis.buttons)}>
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
        'flex items-center py-3 gap-x-4',
        'text-xs text-gray-7c8db5',
        className,
      )}
    >
      <div className="basis-auto grow md:basis-4/12 xl:basis-6/12 md:grow-0">
        Invited user
      </div>
      <div className={basis.allowance}>Karma</div>
      <div className={basis.status}>Status</div>
      <div className={basis.buttons}></div>
    </div>
  )
}

type TListItemProps = {
  item: TDaoInviteListItem
}

const ListItem = (props: TListItemProps) => {
  const { item } = props
  const dao = useDao()
  const { revoke, create } = useDaoInviteList()

  const onRevoke = async (id: string) => {
    if (window.confirm('Revoke token?')) {
      try {
        await revoke(id)
      } catch (e: any) {
        console.error(e.message)
        toast.error(<ToastError error={e} />)
      }
    }
  }

  const onCreateMember = async (item: TDaoInviteListItem) => {
    if (window.confirm('Add member to DAO?')) {
      try {
        await create(item)
      } catch (e: any) {
        console.error(e.message)
      }
    }
  }

  return (
    <>
      <div
        className={classNames(
          'flex items-center py-2 gap-x-4 gap-y-3 text-sm',
          basis.contaner,
        )}
      >
        <div className={basis.token}>
          {item.email ? (
            <span>
              {item.email}
              {item.username && <span className="ml-1 text-xs">({item.username})</span>}
            </span>
          ) : (
            'Anybody can use'
          )}

          <CopyClipboard
            className="text-xs text-gray-53596d"
            label={shortString(item.token, 8, 8)}
            componentProps={{
              text: `${window.location.origin}/o/${dao.details.name}/onboarding?token=${item.token}`,
            }}
          />
          {item.comment && <div className="text-xs text-gray-7c8db5">{item.comment}</div>}
        </div>
        <div className={basis.allowance}>{item.allowance?.toLocaleString() || 0}</div>
        <div className={basis.status}>{item.status || 'pending'}</div>
        <div className={basis.buttons}>
          {!item.status && (
            <Button
              type="button"
              variant="outline-secondary"
              className="w-full md:w-auto"
              size="sm"
              disabled={item.isFetching}
              isLoading={item.isFetching}
              onClick={() => onRevoke(item.id)}
            >
              Revoke
            </Button>
          )}
          {item.status === EDaoInviteStatus.ACCEPTED && (
            <Button
              type="button"
              variant="custom"
              size="sm"
              className={classNames(
                '!border-gray-e6edff !py-1 !px-6 text-green-600',
                'hover:text-white hover:bg-green-600 hover:!border-transparent',
                'disabled:opacity-60 w-full md:w-auto',
              )}
              disabled={item.isFetching}
              isLoading={item.isFetching}
              onClick={() => onCreateMember(item)}
            >
              Add member
            </Button>
          )}
        </div>
      </div>
    </>
  )
}

export { ListItem, ListItemSkeleton, ListItemHeader }

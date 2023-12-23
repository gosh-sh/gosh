import classNames from 'classnames'
import { useDao, useDaoMember } from '../../hooks/dao.hooks'
import { useSetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../../store/app.state'
import { Button } from '../../../components/Form'
import { DaoTokenMintModal, DaoTokenSendModal } from '../Modal'

type TDaoSupplyProps = React.HTMLAttributes<HTMLDivElement>

const DaoSupply = (props: TDaoSupplyProps) => {
  const { className } = props
  const setModal = useSetRecoilState(appModalStateAtom)
  const dao = useDao()
  const member = useDaoMember()

  const onDaoTokenSendClick = () => {
    setModal({
      static: true,
      isOpen: true,
      element: <DaoTokenSendModal />,
    })
  }

  const onDaoMintClick = () => {
    setModal({
      static: true,
      isOpen: true,
      element: <DaoTokenMintModal />,
    })
  }

  return (
    <div className={classNames('border border-gray-e6edff rounded-xl p-5', className)}>
      <div>
        <div className="mb-1 text-gray-7c8db5 text-sm">DAO total supply</div>
        <div className="text-3xl font-medium">
          {dao.details.supply?.total.toLocaleString()}
        </div>
      </div>
      <hr className="my-4 bg-gray-e6edff" />
      <div>
        <div className="mb-1 text-gray-7c8db5 text-sm">DAO reserve</div>
        <div className="text-xl font-medium">
          {dao.details.supply?.reserve.toLocaleString()}
        </div>
      </div>
      {member.isMember && (
        <div className="mt-3 flex flex-wrap gap-x-3">
          <div className="grow">
            <Button
              className={classNames(
                'w-full !border-gray-e6edff bg-gray-fafafd',
                'hover:!border-gray-53596d',
              )}
              variant="custom"
              onClick={onDaoTokenSendClick}
            >
              Send
            </Button>
          </div>
          {dao.details.isMintOn && (
            <div className="grow">
              <Button
                className={classNames(
                  'w-full !border-gray-e6edff bg-gray-fafafd',
                  'hover:!border-gray-53596d',
                )}
                variant="custom"
                onClick={onDaoMintClick}
              >
                Mint
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export { DaoSupply }

import classNames from 'classnames'
import { useDao } from '../../hooks/dao.hooks'

type TDaoSupplyProps = React.HTMLAttributes<HTMLDivElement>

const DaoSupply = (props: TDaoSupplyProps) => {
  const { className } = props
  const dao = useDao()

  return (
    <div className={classNames('border border-gray-e6edff rounded-xl p-5', className)}>
      <div>
        <div className="mb-1 text-gray-7c8db5 text-sm">DAO total supply</div>
        <div className="text-3xl font-medium">
          {dao.details.supply?.total.toLocaleString()}
        </div>
      </div>
    </div>
  )
}

export { DaoSupply }

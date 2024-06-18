import { useDao, useDaoMember } from '../../hooks/dao.hooks'
import Skeleton from '../../../components/Skeleton'
import classNames from 'classnames'

type TDaoSummaryProps = React.HTMLAttributes<HTMLDivElement>

const DaoSummary = (props: TDaoSummaryProps) => {
  const { className } = props
  const dao = useDao()
  const member = useDaoMember()

  if (dao.isFetchingData && dao.details.summary === undefined) {
    return (
      <Skeleton
        className={classNames('w-full lg:w-4/12', className)}
        skeleton={{ height: 6 }}
      >
        <rect x="0" y="0" rx="4" ry="4" width="100%" height="6" />
      </Skeleton>
    )
  }

  return (
    <div className={classNames(className)}>
      {!dao.details.summary && member.isMember && (
        <div>
          Place <span className="font-medium">description.txt</span> to main branch of{' '}
          <span className="font-medium">_index</span> repo to add short description
        </div>
      )}
      {dao.details.summary}
    </div>
  )
}

export { DaoSummary }

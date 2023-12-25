import { Link } from 'react-router-dom'
import { useDao } from '../../../../hooks/dao.hooks'

type TBranchProtectEventProps = {
  data: { branchName: string; repoName: string }
}

const BranchProtectEvent = (props: TBranchProtectEventProps) => {
  const { data } = props
  const dao = useDao()

  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-center gap-6">
        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
          Repository
        </div>
        <div className="text-sm">
          <Link
            to={`/o/${dao.details.name}/r/${data.repoName}/branches`}
            className="text-blue-2b89ff"
          >
            {data.repoName}
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">Branch</div>
        <div className="text-sm">{data.branchName}</div>
      </div>
    </div>
  )
}

export { BranchProtectEvent }

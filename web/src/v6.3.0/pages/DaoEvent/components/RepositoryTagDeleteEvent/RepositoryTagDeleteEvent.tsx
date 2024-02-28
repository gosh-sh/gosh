import { Link } from 'react-router-dom'
import { useDao } from '../../../../hooks/dao.hooks'

type TRepositoryTagDeleteEventProps = {
  data: {
    repo: string
    daotag: string[]
  }
}

const RepositoryTagDeleteEvent = (props: TRepositoryTagDeleteEventProps) => {
  const { data } = props
  const dao = useDao()

  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-center gap-6">
        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
          Repository
        </div>
        <div className="text-sm">
          <Link to={`/o/${dao.details.name}/r/${data.repo}`} className="text-blue-2b89ff">
            {data.repo}
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">Tags</div>
        <div className="text-sm">{data.daotag.join(', ')}</div>
      </div>
    </div>
  )
}

export { RepositoryTagDeleteEvent }

import { Link } from 'react-router-dom'
import { useDao } from '../../../../hooks/dao.hooks'
import CopyClipboard from '../../../../../components/CopyClipboard'
import { shortString } from '../../../../../utils'

type TUpgradeTaskEventProps = {
  data: {
    reponame: string
    taskname: string
    oldtask: string
    oldversion: string
    hashtag: string[]
  }
}

const UpgradeTaskEvent = (props: TUpgradeTaskEventProps) => {
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
            to={`/o/${dao.details.name}/r/${data.reponame}`}
            className="text-blue-2b89ff"
          >
            {data.reponame}
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">Task name</div>
        <div className="text-sm">{data.taskname}</div>
      </div>
      <div className="flex items-center gap-6">
        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
          Prev address
        </div>
        <div className="text-sm">
          <CopyClipboard
            label={shortString(data.oldtask)}
            componentProps={{ text: data.oldtask }}
          />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
          Prev version
        </div>
        <div className="text-sm">{data.oldversion}</div>
      </div>
      <div className="flex items-center gap-6">
        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">Tags</div>
        <div className="text-sm">{data.hashtag.join(', ')}</div>
      </div>
    </div>
  )
}

export { UpgradeTaskEvent }

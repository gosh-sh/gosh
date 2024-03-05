import { Link } from 'react-router-dom'
import { useDao } from '../../../../hooks/dao.hooks'

type TRepositoryMetadataEventProps = {
  data: {
    nameRepo: string
    metadata: object
  }
}

const RepositoryMetadataEvent = (props: TRepositoryMetadataEventProps) => {
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
            to={`/o/${dao.details.name}/r/${data.nameRepo}`}
            className="text-blue-2b89ff"
          >
            {data.nameRepo}
          </Link>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="grow basis-full text-xs text-gray-53596d">Metadata</div>
        <div className="text-[0.7rem]">
          <pre>
            <code>{JSON.stringify(data.metadata, undefined, 2)}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}

export { RepositoryMetadataEvent }

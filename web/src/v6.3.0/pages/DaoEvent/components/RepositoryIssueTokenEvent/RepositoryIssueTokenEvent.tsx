import { Link } from 'react-router-dom'
import { useDao } from '../../../../hooks/dao.hooks'

type TRepositoryIssueTokenEventProps = {
  data: {
    repoName: string
    tokendescription: { [key: string]: any }
    tokengrants: object[]
  }
}

const RepositoryIssueTokenEvent = (props: TRepositoryIssueTokenEventProps) => {
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
            to={`/o/${dao.details.name}/r/${data.repoName}`}
            className="text-blue-2b89ff"
          >
            {data.repoName}
          </Link>
        </div>
      </div>

      {Object.keys(data.tokendescription).map((key, index) => (
        <div key={index} className="flex items-center gap-6">
          <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d capitalize">
            {key}
          </div>
          <div className="text-sm">{data.tokendescription[key]}</div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <div className="grow basis-full text-xs text-gray-53596d">Token distribution</div>
        <div className="text-[0.7rem]">
          <pre>
            <code>{JSON.stringify(data.tokengrants, undefined, 2)}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}

export { RepositoryIssueTokenEvent }

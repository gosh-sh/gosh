import { Link } from 'react-router-dom'
import { useDao } from '../../../../hooks/dao.hooks'

type TRepositoryDeleteEventProps = {
    data: { repoName: string }
    isCompleted: boolean
}

const RepositoryDeleteEvent = (props: TRepositoryDeleteEventProps) => {
    const { data, isCompleted } = props
    const dao = useDao()

    return (
        <div className="flex flex-col gap-2 py-3">
            <div className="flex items-center gap-6">
                <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                    Repository
                </div>
                <div className="text-sm">
                    {isCompleted ? (
                        data.repoName
                    ) : (
                        <Link
                            to={`/o/${dao.details.name}/r/${data.repoName}`}
                            className="text-blue-2b89ff"
                        >
                            {data.repoName}
                        </Link>
                    )}
                </div>
            </div>
        </div>
    )
}

export { RepositoryDeleteEvent }

import { Link } from 'react-router-dom'
import { useDao } from '../../../../hooks/dao.hooks'

type TRepositoryDescriptionEventProps = {
    data: {
        repo: string
        descr: string
    }
}

const RepositoryDescriptionEvent = (props: TRepositoryDescriptionEventProps) => {
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
                        to={`/o/${dao.details.name}/r/${data.repo}`}
                        className="text-blue-2b89ff"
                    >
                        {data.repo}
                    </Link>
                </div>
            </div>
            <div className="flex items-center gap-6">
                <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                    Description
                </div>
                <div className="text-sm">{data.descr || '-'}</div>
            </div>
        </div>
    )
}

export { RepositoryDescriptionEvent }

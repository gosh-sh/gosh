import { faCodeFork } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link } from 'react-router-dom'
import CopyClipboard from '../../components/CopyClipboard'
import { shortString } from 'react-gosh'
import { TRepository } from 'react-gosh/dist/types/repo.types'
import ReactTooltip from 'react-tooltip'

type TRepositoryListItemProps = {
    daoName: string
    daoLink?: boolean
    item: Omit<TRepository, 'branches' | 'head' | 'commitsIn'> & {
        branches?: number
        head?: string
        commitsIn?: any[]
    }
}

const RepositoryListItem = (props: TRepositoryListItemProps) => {
    const { daoName, item, daoLink = false } = props

    return (
        <div className="p-4">
            <div className="flex flex-wrap mb-1">
                {daoLink && (
                    <>
                        <Link className="text-xl font-medium" to={`/o/${daoName}`}>
                            {daoName}
                        </Link>
                        <span className="mx-1">/</span>
                    </>
                )}
                <Link className="text-xl font-medium" to={`/o/${daoName}/r/${item.name}`}>
                    {item.name}
                </Link>
                <span className="ml-2 align-super text-xs text-gray-7c8db5">
                    {item.version}
                </span>
            </div>

            <div className="text-sm text-gray-53596d">Gosh repository</div>

            <div className="flex gap-4 mt-3 text-sm text-gray-7c8db5 justify-between">
                <div className="flex gap-4">
                    <div data-tip="Branches">
                        <FontAwesomeIcon icon={faCodeFork} className="mr-1" />
                        {item.branches}
                    </div>
                </div>
                <CopyClipboard
                    componentProps={{
                        text: item.address,
                    }}
                    label={
                        <span data-tip="Repository address">
                            {shortString(item.address)}
                        </span>
                    }
                />
            </div>
            <ReactTooltip clickable />
        </div>
    )
}

export default RepositoryListItem

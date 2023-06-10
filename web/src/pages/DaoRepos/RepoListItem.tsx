import { faCodeFork } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link } from 'react-router-dom'
import CopyClipboard from '../../components/CopyClipboard'
import { shortString } from 'react-gosh'
import { TRepositoryListItem } from 'react-gosh/dist/types/repo.types'
import { Tooltip } from 'react-tooltip'
import Loader from '../../components/Loader/Loader'

type TRepositoryListItemProps = {
    daoName: string
    daoLink?: boolean
    item: TRepositoryListItem
    aiProcessing?: boolean
}

const RepositoryListItem = (props: TRepositoryListItemProps) => {
    const { daoName, item, daoLink = false, aiProcessing } = props

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

            {item.description && (
                <div className="text-xs text-gray-7c8db5">{item.description}</div>
            )}

            {aiProcessing && (
                <Loader className="mt-2 text-xs">
                    Developing with
                    <span className="inline-block rounded-lg bg-blue-2b89ff text-white px-2 py-0.5 ml-2">
                        GoshAI
                    </span>
                </Loader>
            )}

            <div className="flex gap-4 mt-3 text-sm text-gray-7c8db5 justify-between">
                <div className="flex gap-4">
                    <div data-tooltip-id="common-tip" data-tooltip-content="Branches">
                        <FontAwesomeIcon icon={faCodeFork} className="mr-1" />
                        {item.branches?.length}
                    </div>
                </div>
                <CopyClipboard
                    componentProps={{
                        text: item.address,
                    }}
                    label={
                        <span
                            data-tooltip-id="common-tip"
                            data-tooltip-content="Repository address"
                        >
                            {shortString(item.address)}
                        </span>
                    }
                />
            </div>
            <Tooltip id="common-tip" clickable />
        </div>
    )
}

export default RepositoryListItem

import { Link, useOutletContext } from 'react-router-dom'
import { classNames, useSmvEventListRecent } from 'react-gosh'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import ReposPage from '../DaoRepos'
import { DaoMembersSide, DaoSupplySide } from '../../components/Dao'
import { useCallback, useEffect, useState } from 'react'
import BlobPreview from '../../components/Blob/Preview'

const DaoPage = () => {
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const { items: events } = useSmvEventListRecent(dao.adapter!, 3)
    const [description, setDescription] = useState<string | null>()

    const getDaoDescription = useCallback(async () => {
        if (dao.adapter) {
            const content = await dao.adapter.getDescription()
            setDescription(content)
        }
    }, [dao.adapter])

    useEffect(() => {
        getDaoDescription()
    }, [getDaoDescription])

    return (
        <div className="flex flex-wrap gap-4 justify-between">
            <div className="basis-8/12">
                <div className="border border-gray-e6edff rounded-xl px-4 py-5 mb-9">
                    {!description ? (
                        <div className="py-10 text-center text-sm text-gray-7c8db5">
                            Create readme.md file
                            <br />
                            in main branch of your _index repository
                            <br />
                            to add info about organization
                        </div>
                    ) : (
                        <BlobPreview
                            filename="README.md"
                            value={description}
                            className="!p-0"
                        />
                    )}
                </div>

                <div className="border border-gray-e6edff rounded-xl px-4 py-5 mb-9">
                    <h3 className="text-xl font-medium">Recent proposals</h3>
                    {!events.length && (
                        <div className="py-10 text-center text-sm text-gray-7c8db5">
                            There are no events <br />
                            in the organization yet
                        </div>
                    )}
                    <div className="mt-5 flex flex-nowrap divide-x divide-gray-e6edff">
                        {events.map((item, index) => {
                            const { time, type, address, status } = item
                            return (
                                <div key={index} className="px-4">
                                    <div className="my-1 text-gray-7c8db5 text-xs">
                                        Due - {new Date(time.finishReal).toLocaleString()}
                                    </div>
                                    <div className="mb-4">
                                        <Link
                                            to={`/o/${dao.details.name}/events/${address}`}
                                            className="font-medium"
                                        >
                                            {type.name}
                                        </Link>
                                    </div>
                                    <div>
                                        <span
                                            className={classNames(
                                                'rounded py-0.5 px-4 text-xs',
                                                !status.completed
                                                    ? 'bg-gray-d6e4ee'
                                                    : status.accepted
                                                    ? 'bg-lime-100'
                                                    : 'bg-rose-200',
                                            )}
                                        >
                                            {!item.status.completed
                                                ? 'In progress'
                                                : item.status.accepted
                                                ? 'Accepted'
                                                : 'Rejected'}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
                <div className="grow">
                    <ReposPage />
                </div>
            </div>
            <div className="grow">
                <DaoSupplySide details={dao.details} />
                <DaoMembersSide details={dao.details} />
            </div>
        </div>
    )
}

export default DaoPage

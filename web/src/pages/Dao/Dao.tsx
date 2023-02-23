import { Link, useOutletContext } from 'react-router-dom'
import { classNames, useSmv, useSmvEventList } from 'react-gosh'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import ReposPage from '../DaoRepos'
import { DaoMembersSide, DaoSupplySide } from '../../components/Dao'
import { useCallback, useEffect, useState } from 'react'
import BlobPreview from '../../components/Blob/Preview'
import { DaoWalletSide } from '../../components/Dao/WalletSide'

const DaoPage = () => {
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const wallet = useSmv(dao)
    const { items: events, getItemDetails: getEventDetails } = useSmvEventList(
        dao.adapter!,
        { perPage: 3 },
    )
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
                {dao.details.version !== '1.0.0' && (
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
                )}

                {dao.details.version !== '1.0.0' && (
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
                                getEventDetails(item)
                                const { time, type, address, status } = item
                                return (
                                    <div key={index} className="px-4">
                                        {time && (
                                            <div className="my-1 text-gray-7c8db5 text-xs">
                                                Due -{' '}
                                                {new Date(
                                                    time.finishReal,
                                                ).toLocaleString()}
                                            </div>
                                        )}
                                        <div className="mb-4">
                                            <Link
                                                to={`/o/${dao.details.name}/events/${address}`}
                                                className="font-medium"
                                            >
                                                {type.name}
                                            </Link>
                                        </div>
                                        {status && (
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
                                                    {!status.completed
                                                        ? 'In progress'
                                                        : status.accepted
                                                        ? 'Accepted'
                                                        : 'Rejected'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                <div className="grow">
                    <ReposPage />
                </div>
            </div>
            <div className="grow flex flex-col gap-y-5">
                <DaoSupplySide dao={dao} />
                <DaoWalletSide dao={dao} wallet={wallet} />
                <DaoMembersSide dao={dao.details} />
            </div>
        </div>
    )
}

export default DaoPage

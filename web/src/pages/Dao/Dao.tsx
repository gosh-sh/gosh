import { Link, useOutletContext, useParams } from 'react-router-dom'
import CopyClipboard from '../../components/CopyClipboard'
import { shortString } from 'react-gosh'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import ReposPage from '../DaoRepos'

const DaoPage = () => {
    const { daoName } = useParams()
    const { dao, wallet } = useOutletContext<TDaoLayoutOutletContext>()

    return (
        <div className="flex flex-wrap-reverse gap-x-4 gap-y-6">
            <div className="grow">
                <ReposPage />
            </div>
            <div className="basis-full md:basis-4/12 lg:basis-3/12 bordered-block px-7 py-8">
                <h3 className="font-semibold text-base mb-4">Details</h3>

                <div>
                    <p className="text-sm text-gray-606060 mb-1">DAO address</p>
                    <CopyClipboard
                        label={shortString(dao.address)}
                        componentProps={{
                            text: dao.address,
                        }}
                    />
                </div>
                <div className="mt-4">
                    <p className="text-sm text-gray-606060 mb-1">Git remote</p>
                    {wallet?.isDaoParticipant ? (
                        <Link
                            to={`/${daoName}/settings/wallet`}
                            className="hover:underline"
                        >
                            Setup git remote
                        </Link>
                    ) : (
                        <p className="text-sm text-rose-400">Not a DAO participant</p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default DaoPage

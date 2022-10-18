import { Link, useOutletContext, useParams } from 'react-router-dom'
import { useRepoList } from 'react-gosh'
import RepoListItem from './RepoListItem'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import Spinner from '../../components/Spinner'

const DaoRepositoriesPage = () => {
    const { daoName } = useParams()
    const {
        items,
        isFetching,
        isEmpty,
        hasNext,
        search,
        setSearch,
        getMore,
        getItemDetails,
    } = useRepoList(daoName!, 5)
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()

    return (
        <div className="bordered-block px-7 py-8">
            <h3 className="font-semibold text-base mb-4">Repositories</h3>
            <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="input grow">
                    <input
                        type="search"
                        autoComplete="off"
                        placeholder="Search repository..."
                        className="element !py-1.5"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>

                {dao?.details.isAuthMember && (
                    <Link
                        className="btn btn--body px-4 py-1.5 !font-normal text-center w-full sm:w-auto"
                        to={`/o/${daoName}/repos/create`}
                    >
                        New repository
                    </Link>
                )}
            </div>

            <div className="mt-4">
                {isFetching && (
                    <div className="text-sm text-gray-606060">
                        <Spinner className="mr-3" />
                        Loading repositories...
                    </div>
                )}

                {isEmpty && (
                    <div className="text-sm text-gray-606060 text-center">
                        There are no repositories yet
                    </div>
                )}

                <div className="divide-y divide-gray-c4c4c4">
                    {items.map((item, index) => {
                        getItemDetails(item)
                        return <RepoListItem key={index} daoName={daoName!} item={item} />
                    })}
                </div>

                {hasNext && (
                    <div className="text-center mt-3">
                        <button
                            className="btn btn--body font-medium px-4 py-2 w-full sm:w-auto"
                            type="button"
                            disabled={isFetching}
                            onClick={getMore}
                        >
                            {isFetching && <Spinner className="mr-2" />}
                            Load more
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default DaoRepositoriesPage

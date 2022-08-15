import { Link } from 'react-router-dom'
import Spinner from '../../components/Spinner'
import { useDaoList } from 'react-gosh'
import DaoListItem from './DaoListItem'

const DaosPage = () => {
    const {
        items,
        isFetching,
        isEmpty,
        hasNext,
        search,
        setSearch,
        loadNext,
        loadItemDetails,
    } = useDaoList(5)

    return (
        <>
            <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="input basis-full sm:basis-1/2">
                    <input
                        className="element !py-1.5"
                        type="text"
                        placeholder="Search orgranization..."
                        autoComplete="off"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Link
                    to="/account/orgs/create"
                    className="btn btn--body py-1.5 px-3 !font-normal text-center w-full sm:w-auto"
                >
                    New organization
                </Link>
            </div>

            <div className="mt-8">
                {isFetching && (
                    <div className="text-gray-606060">
                        <Spinner className="mr-3" />
                        Loading organizations...
                    </div>
                )}
                {isEmpty && (
                    <div className="text-gray-606060 text-center">
                        You have no organizations yet
                    </div>
                )}

                <div className="divide-y divide-gray-c4c4c4">
                    {items.map((item, index) => {
                        loadItemDetails(item)
                        return <DaoListItem key={index} item={item} />
                    })}
                </div>

                {hasNext && (
                    <div className="text-center mt-3">
                        <button
                            className="btn btn--body font-medium px-4 py-2 w-full sm:w-auto"
                            type="button"
                            disabled={isFetching}
                            onClick={loadNext}
                        >
                            {isFetching && <Spinner className="mr-2" />}
                            Load more
                        </button>
                    </div>
                )}
            </div>
        </>
    )
}

export default DaosPage

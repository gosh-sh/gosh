import { Link } from 'react-router-dom'
import Spinner from '../../components/Spinner'
import { AppConfig, GoshProfile, useDaoList, userStateAtom } from 'react-gosh'
import DaoListItem from './DaoListItem'
import { useRecoilValue } from 'recoil'

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
    const { keys } = useRecoilValue(userStateAtom)

    const onSetGosh = async () => {
        if (!keys) return

        const profile = new GoshProfile(
            AppConfig.goshclient,
            '0:1194a4a099e844fc974412b7cd3a6c40b7a76b14fd91be3fc6f94efa0a83ab32',
            keys,
        )
        await profile.setGosh(
            '0:271c35ae906cc68d142609d2c548d690ab2a35be08ce86c7a80a6fcbb5aaa8ae',
        )
    }

    return (
        <>
            <div>
                <button onClick={onSetGosh}>Set gosh</button>
            </div>
            <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="input basis-full sm:basis-1/2">
                    <input
                        className="element !py-1.5"
                        type="search"
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

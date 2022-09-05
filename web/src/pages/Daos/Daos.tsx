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

    const onGetVersions = async () => {
        const versions = await AppConfig.goshroot.getVersions()
        console.debug(versions)
    }

    const onGetGosh = async () => {
        const gosh = await AppConfig.goshroot.getGosh('0.1.203')
        console.debug(gosh)
    }

    const onSetGosh = async () => {
        if (!keys) return

        const profile = new GoshProfile(
            AppConfig.goshclient,
            '0:825956b94a536906bf0f1fb89feb56d9bc13e51dcc717a3686db94caed1b66ec',
            keys,
        )
        await profile.setGosh(
            '0:f03920fec66868626f1cd8d869833076487ca44d1ad47c75c772f114abe27267',
        )
    }

    return (
        <>
            <div>
                <button onClick={onGetVersions}>Get versions</button>
                <button onClick={onGetGosh} className="mx-3">
                    Get gosh
                </button>
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

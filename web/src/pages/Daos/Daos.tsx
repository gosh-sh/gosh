import { Link } from 'react-router-dom'
import Spinner from '../../components/Spinner'
import { useDaoList, useUser } from 'react-gosh'
import DaoListItem from './DaoListItem'
import { useEffect, useState } from 'react'
import { supabase } from '../../helpers'
import ExternalListItem from './ExternalListItem'

const DaosPage = () => {
    const { user } = useUser()
    const {
        items,
        isFetching,
        isEmpty,
        hasNext,
        search,
        setSearch,
        getMore,
        getItemDetails,
    } = useDaoList(5)
    const [githubData, setGithubData] = useState<any[]>([])

    useEffect(() => {
        const _getGithubData = async () => {
            const { data } = await supabase
                .from('users')
                .select(`*, github (updated_at, github_url)`)
                .eq('gosh_username', user.username)
            if (!data) return

            const imported: { [name: string]: string[] } = {}
            const row = data[0]
            for (const item of row.github) {
                if (item.updated_at) continue

                const [dao, repo] = item.github_url.slice(1).split('/')
                if (Object.keys(imported).indexOf(dao) < 0) {
                    imported[dao] = []
                }
                if (imported[dao].indexOf(repo) < 0) {
                    imported[dao].push(repo)
                }
            }

            const importedList = Object.keys(imported).map((key) => ({
                name: key,
                repos: imported[key],
            }))
            setGithubData(importedList)
        }

        _getGithubData()
    }, [])

    return (
        <>
            <div className="flex flex-wrap justify-between items-center gap-3 mb-8">
                <div className="input basis-full sm:basis-1/2">
                    <input
                        className="element !py-1.5"
                        type="search"
                        placeholder="Search GOSH orgranization..."
                        autoComplete="off"
                        value={search}
                        disabled={isFetching}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Link
                    to="/a/orgs/create"
                    className="btn btn--body py-1.5 px-3 !font-normal text-center w-full sm:w-auto"
                >
                    New organization
                </Link>
            </div>

            {!!githubData.length && (
                <div className="mb-14">
                    <div className="text-xl font-medium border-b pb-2 mb-4">
                        Pending import from GitHub
                    </div>

                    <div className="flex flex-wrap gap-5 justify-between">
                        {githubData.map((item, index) => (
                            <ExternalListItem
                                key={index}
                                className={'basis-full md:basis-[48.1%]'}
                                item={item}
                            />
                        ))}
                    </div>
                </div>
            )}

            <div>
                <div className="text-xl font-medium border-b pb-2 mb-4">
                    GOSH organizations
                </div>

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

                <div className="flex flex-wrap gap-5 justify-between">
                    {items.map((item, index) => {
                        getItemDetails(item)
                        return (
                            <DaoListItem
                                key={index}
                                className={'basis-full md:basis-[48.1%]'}
                                item={item}
                            />
                        )
                    })}
                </div>

                {hasNext && (
                    <div className="text-center mt-6">
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
        </>
    )
}

export default DaosPage

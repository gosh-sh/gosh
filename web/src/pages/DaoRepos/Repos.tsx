import { useEffect, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { GoshRepository, useGosh, useGoshVersions } from 'react-gosh'
import { TGoshBranch, TGoshRepoDetails, TGoshTagDetails } from 'react-gosh'
import RepoListItem from './RepoListItem'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import Spinner from '../../components/Spinner'
import { getPaginatedAccounts, AppConfig } from 'react-gosh'
import { sleep } from 'react-gosh'

const DaoRepositoriesPage = () => {
    const pageSize = 10

    const { daoName } = useParams()
    const { dao, wallet } = useOutletContext<TDaoLayoutOutletContext>()
    const { versions } = useGoshVersions()
    const gosh = useGosh()
    const [search, setSearch] = useState<string>('')
    const [repos, setRepos] = useState<{
        items: (Omit<TGoshRepoDetails, 'branches' | 'head' | 'tags'> & {
            branches?: TGoshBranch[]
            head?: string
            tags?: TGoshTagDetails[]
            isBusy?: boolean
        })[]
        isFetching: boolean
        filtered: string[]
        page: number
    }>({
        items: [],
        isFetching: true,
        filtered: [],
        page: 1,
    })

    /** Load next chunk of repo list items */
    const onLoadMore = () => {
        setRepos((state) => ({ ...state, page: state.page + 1 }))
    }

    /** Load repo details and update corresponging list item */
    const setRepoDetails = async (address: string) => {
        setRepos((state) => ({
            ...state,
            items: state.items.map((item) => {
                if (item.address === address) return { ...item, isBusy: true }
                return item
            }),
        }))

        const repo = new GoshRepository(AppConfig.goshclient, address, versions.latest)
        const details = await repo.getDetails()

        setRepos((state) => ({
            ...state,
            items: state.items.map((item) => {
                if (item.address === address) return details
                return item
            }),
        }))
    }

    /** Initial load of all repo accounts with repo names */
    useEffect(() => {
        const getRepoList = async () => {
            if (!gosh) return

            setRepos({ items: [], isFetching: true, filtered: [], page: 1 })

            // Get GoshRepo code and all repos accounts
            const repoCodeHash = await gosh.getRepositoryCodeHash(dao.instance.address)
            const list: any[] = []
            let next: string | undefined
            while (true) {
                const accounts = await getPaginatedAccounts({
                    filters: [`code_hash: {eq:"${repoCodeHash}"}`],
                    limit: 50,
                    lastId: next,
                })
                const items = await Promise.all(
                    accounts.results.map(async ({ id }) => {
                        const repo = new GoshRepository(
                            AppConfig.goshroot.account.client,
                            id,
                            versions.latest,
                        )
                        return { address: repo.address, name: await repo.getName() }
                    }),
                )
                list.push(...items)
                next = accounts.lastId

                if (accounts.completed) break
                await sleep(200)
            }
            setRepos({
                items: list,
                isFetching: false,
                filtered: list.map((item) => item.address),
                page: 1,
            })
        }

        getRepoList()
    }, [gosh, dao.instance.address])

    /** Update filtered items and page depending on search */
    useEffect(() => {
        setRepos((state) => {
            return {
                ...state,
                page: search ? 1 : state.page,
                filtered: state.items
                    .filter((item) => {
                        const pattern = new RegExp(search, 'i')
                        return !search || item.name.search(pattern) >= 0
                    })
                    .map((item) => item.address),
            }
        })
    }, [search])

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

                {wallet?.details.isDaoMember && (
                    <Link
                        className="btn btn--body px-4 py-1.5 !font-normal text-center w-full sm:w-auto"
                        to={`/o/${daoName}/repos/create`}
                    >
                        New repository
                    </Link>
                )}
            </div>

            <div className="mt-5 divide-y divide-gray-c4c4c4">
                {repos.isFetching && (
                    <div className="text-sm text-gray-606060">
                        <Spinner className="mr-3" />
                        Loading repositories...
                    </div>
                )}

                {!repos.isFetching && !repos.filtered.length && (
                    <div className="text-sm text-gray-606060 text-center">
                        There are no repositories yet
                    </div>
                )}

                {repos.items
                    .filter((item) => {
                        return repos.filtered.indexOf(item.address) >= 0
                    })
                    .slice(0, repos.page * pageSize)
                    .map((details, index) => {
                        const { branches, isBusy } = details
                        if (!branches && !isBusy) setRepoDetails(details.address)
                        if (daoName) {
                            return (
                                <RepoListItem
                                    key={index}
                                    daoName={daoName}
                                    item={details}
                                />
                            )
                        }
                        return null
                    })}
            </div>

            {repos.page * pageSize < repos.filtered.length && (
                <div className="text-center mt-3">
                    <button
                        className="btn btn--body font-medium px-4 py-2 w-full sm:w-auto"
                        type="button"
                        disabled={repos.isFetching}
                        onClick={onLoadMore}
                    >
                        {repos.isFetching && <Spinner className="mr-2" />}
                        Load more
                    </button>
                </div>
            )}
        </div>
    )
}

export default DaoRepositoriesPage

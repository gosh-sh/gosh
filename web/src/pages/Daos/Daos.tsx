import { useDaoList, useUser } from 'react-gosh'
import DaoListItem from './DaoListItem'
import { useEffect, useState } from 'react'
import { supabase } from '../../helpers'
import ExternalListItem from './ExternalListItem'
import { Button, ButtonLink, Input } from '../../components/Form'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import Loader from '../../components/Loader'

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
    } = useDaoList(6)
    const [githubData, setGithubData] = useState<any[]>([])

    useEffect(() => {
        const _getGithubData = async () => {
            const { data } = await supabase
                .from('users')
                .select(`*, github (updated_at, gosh_url)`)
                .eq('gosh_username', user.username)
            if (!data?.length) return

            const imported: { [name: string]: string[] } = {}
            const row = data[0]
            for (const item of row.github) {
                if (item.updated_at) continue

                const splitted = item.gosh_url.split('/')
                const dao = splitted[splitted.length - 2]
                const repo = splitted[splitted.length - 1]
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
    }, [user.username])

    return (
        <>
            <div className="flex flex-wrap justify-between items-center gap-3 mb-8">
                <Input
                    className="grow"
                    type="search"
                    placeholder="Search GOSH DAO..."
                    autoComplete="off"
                    value={search}
                    disabled={isFetching}
                    onChange={(e) => setSearch(e.target.value)}
                    before={
                        <FontAwesomeIcon
                            icon={faMagnifyingGlass}
                            className="text-gray-7c8db5 font-extralight py-3 pl-4"
                        />
                    }
                    test-id="input-dao-search"
                />
                <ButtonLink to="/a/orgs/create" test-id="link-dao-create">
                    Create new DAO
                </ButtonLink>
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
                <div className="text-xl font-medium border-b border-b-gray-e6edff pb-2 mb-4">
                    GOSH organizations
                </div>

                {isFetching && <Loader>Loading organizations...</Loader>}
                {isEmpty && (
                    <div className="text-sm text-gray-7c8db5 text-center">
                        There are no organizations
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
                        <Button
                            type="button"
                            disabled={isFetching}
                            isLoading={isFetching}
                            onClick={getMore}
                            test-id="btn-dao-more"
                        >
                            Load more
                        </Button>
                    </div>
                )}
            </div>
        </>
    )
}

export default DaosPage

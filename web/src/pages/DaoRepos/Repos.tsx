import { useOutletContext, useParams } from 'react-router-dom'
import { useRepoList } from 'react-gosh'
import RepoListItem from './RepoListItem'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import { Button, ButtonLink, Input } from '../../components/Form'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import Loader from '../../components/Loader'
import classNames from 'classnames'

const DaoRepositoriesPage = () => {
    const { daoName } = useParams()
    const { items, isFetching, isEmpty, hasNext, search, setSearch, getMore } =
        useRepoList(daoName!, { perPage: 5 })
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()

    return (
        <div>
            <h3 className="text-xl font-medium mb-4">Repositories</h3>

            <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
                <Input
                    className="grow"
                    type="search"
                    placeholder="Search repository (disabled)"
                    autoComplete="off"
                    value={search}
                    disabled={true || isFetching}
                    onChange={(e) => setSearch(e.target.value)}
                    before={
                        <FontAwesomeIcon
                            icon={faMagnifyingGlass}
                            className="text-gray-7c8db5 font-extralight py-3 pl-4"
                        />
                    }
                />
                {dao.details.isAuthMember && (
                    <ButtonLink to={`/o/${daoName}/repos/create`}>Create new</ButtonLink>
                )}
            </div>

            <div className="border border-gray-e6edff rounded-xl overflow-hidden">
                {isFetching && !items.length && (
                    <Loader className="p-4">Loading repositories...</Loader>
                )}

                {isEmpty && (
                    <div className="text-sm text-gray-7c8db5 text-center py-4">
                        There are no repositories
                    </div>
                )}

                <div className="divide-y divide-gray-e6edff">
                    {items.map((item, index) => (
                        <RepoListItem key={index} daoName={daoName!} item={item} />
                    ))}
                </div>

                {hasNext && (
                    <Button
                        type="button"
                        className={classNames(
                            'w-full',
                            '!rounded-none',
                            '!text-gray-7c8db5 !bg-gray-fafafd',
                            'disabled:opacity-70',
                        )}
                        disabled={isFetching}
                        isLoading={isFetching}
                        onClick={getMore}
                    >
                        Show more
                    </Button>
                )}
            </div>
        </div>
    )
}

export default DaoRepositoriesPage

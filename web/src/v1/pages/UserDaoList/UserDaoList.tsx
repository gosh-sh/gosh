import { useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { Button, ButtonLink, Input } from '../../../components/Form'
import Loader from '../../../components/Loader'
import DaoListItem from './components/DaoListItem'
import { useUserDaoList } from '../../hooks/dao.hooks'
import { toast } from 'react-toastify'
import { ToastError } from '../../../components/Toast'

const UserDaoListPage = () => {
    const { items, getUserDaoList, getNext } = useUserDaoList({ count: 6 })

    const onGetNext = async () => {
        try {
            await getNext()
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    useEffect(() => {
        const _getUserDaoList = async () => {
            try {
                await getUserDaoList()
            } catch (e: any) {
                console.error(e.message)
                toast.error(<ToastError error={e} />)
            }
        }

        _getUserDaoList()
    }, [])

    return (
        <>
            <div className="row mb-8">
                <div className="col !basis-full md:!basis-0">
                    <Input
                        type="search"
                        placeholder="Search GOSH DAO... (disabled)"
                        autoComplete="off"
                        disabled={true}
                        before={
                            <FontAwesomeIcon
                                icon={faMagnifyingGlass}
                                className="text-gray-7c8db5 font-extralight py-3 pl-4"
                            />
                        }
                        test-id="input-dao-search"
                    />
                </div>
                <div className="col md:!grow-0">
                    <ButtonLink
                        to="/a/orgs/create"
                        variant="outline-secondary"
                        size="xl"
                        className="block w-full"
                        test-id="link-dao-create"
                    >
                        Create new DAO
                    </ButtonLink>
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between pb-2 mb-4 gap-4">
                    <h1 className="text-xl font-medium">Your organizations</h1>
                    {items.isFetching && <Loader className="text-sm">Updating...</Loader>}
                </div>

                {items.isEmpty && (
                    <div className="text-sm text-gray-7c8db5 text-center">
                        There are no organizations
                    </div>
                )}

                <div className="row">
                    {items.items.map((item, index) => (
                        <div key={index} className="col-n">
                            <DaoListItem className="h-full" item={item} />
                        </div>
                    ))}
                </div>

                {items.hasNext && (
                    <div className="text-center mt-8">
                        <Button
                            type="button"
                            size="xl"
                            className="w-full md:w-auto"
                            disabled={items.isFetching}
                            isLoading={items.isFetching}
                            onClick={onGetNext}
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

export default UserDaoListPage

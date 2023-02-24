import { useOutletContext } from 'react-router-dom'
import { classNames, useSmv, useSmvEventList } from 'react-gosh'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import EventListItem from './ListItem'
import Loader from '../../components/Loader'
import { Button } from '../../components/Form'
import { DaoMembersSide, DaoSupplySide, DaoWalletSide } from '../../components/Dao'

const EventsPage = () => {
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const wallet = useSmv(dao)
    const { items, isFetching, isEmpty, hasNext, getMore, getItemDetails } =
        useSmvEventList(dao.adapter, { perPage: 5 })

    return (
        <div className="flex flex-wrap gap-4 justify-between">
            <div className="basis-8/12">
                <h3 className="text-xl font-medium mb-4">DAO events</h3>
                <div className="border border-gray-e6edff rounded-xl overflow-hidden">
                    {isFetching && !items.length && (
                        <Loader className="p-4">Loading events...</Loader>
                    )}

                    {isEmpty && (
                        <div className="text-gray-7c8db5 text-sm text-center p-4">
                            There are no events
                        </div>
                    )}

                    <div className="divide-y divide-gray-e6edff">
                        {items.map((item, index) => {
                            getItemDetails(item)
                            return (
                                <EventListItem
                                    key={index}
                                    dao={dao.details}
                                    event={item}
                                />
                            )
                        })}
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

            <div className="grow flex flex-col gap-y-5">
                <DaoSupplySide dao={dao} />
                <DaoWalletSide dao={dao} wallet={wallet} />
                <DaoMembersSide dao={dao.details} />
            </div>
        </div>
    )
}

export default EventsPage

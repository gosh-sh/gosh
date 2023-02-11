import { useOutletContext, useParams } from 'react-router-dom'
import { classNames, useSmvEventList } from 'react-gosh'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import EventListItem from './ListItem'
import Loader from '../../components/Loader'
import { Button } from '../../components/Form'
import { DaoMembersSide, DaoSupplySide } from '../../components/Dao'

const EventsPage = () => {
    const { daoName } = useParams()
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const { items, isFetching, isEmpty, hasNext, getMore } = useSmvEventList(
        dao.adapter,
        { perPage: 5 },
    )

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
                        {items.map((item, index) => (
                            <EventListItem
                                key={index}
                                daoName={daoName || ''}
                                event={item}
                            />
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

            <div className="grow">
                <DaoSupplySide details={dao.details} />
                <DaoMembersSide details={dao.details} />
            </div>
        </div>
    )
}

export default EventsPage

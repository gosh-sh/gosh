import { useOutletContext, useParams } from 'react-router-dom'
import Spinner from '../../components/Spinner'
import { useSmv, useSmvEventList } from 'react-gosh'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import SmvBalance from '../../components/SmvBalance/SmvBalance'
import EventListItem from './ListItem'

const EventsPage = () => {
    const { daoName } = useParams()
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const smv = useSmv(dao)
    const { items, isFetching, isEmpty, hasNext, getMore, getItemDetails } =
        useSmvEventList(dao.adapter, 10)

    return (
        <div className="bordered-block px-7 py-8">
            <div>
                {dao.details.isAuthMember && (
                    <SmvBalance
                        adapter={smv.adapter}
                        details={smv.details}
                        className="mb-5 bg-gray-100"
                    />
                )}

                {isFetching && (
                    <div className="text-gray-606060">
                        <Spinner className="mr-3" />
                        Loading events...
                    </div>
                )}

                {isEmpty && (
                    <div className="text-gray-606060 text-center">
                        There are no events yet
                    </div>
                )}

                <div className="divide-y divide-gray-c4c4c4">
                    {items.map((item, index) => {
                        getItemDetails(item)
                        return (
                            <EventListItem
                                key={index}
                                daoName={daoName || ''}
                                event={item}
                            />
                        )
                    })}
                </div>

                {hasNext && (
                    <div className="text-center mt-3">
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
        </div>
    )
}

export default EventsPage

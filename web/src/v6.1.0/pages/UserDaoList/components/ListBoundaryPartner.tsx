import { useErrorBoundary, withErrorBoundary } from 'react-error-boundary'
import Alert from '../../../../components/Alert'
import { usePartnerDaoList } from '../../../hooks/dao.hooks'
import { ListItem, ListItemSkeleton } from './ListItem'
import { useEffect } from 'react'

const ListBoundaryInner = () => {
    const partnerDaoList = usePartnerDaoList({ initialize: true })
    const { showBoundary } = useErrorBoundary()

    useEffect(() => {
        if (partnerDaoList.error) {
            showBoundary(partnerDaoList.error)
        }
    }, [partnerDaoList.error])

    return (
        <div>
            <div className="row">
                {partnerDaoList.isFetching && !partnerDaoList.items.length && (
                    <div className="col-n">
                        <ListItemSkeleton />
                    </div>
                )}

                {partnerDaoList.items.map((item, index) => (
                    <div key={index} className="col-n">
                        <ListItem className="h-full" item={item} />
                    </div>
                ))}
            </div>
        </div>
    )
}

const ListBoundaryPartner = withErrorBoundary(ListBoundaryInner, {
    fallbackRender: ({ error }) => (
        <Alert variant="danger">
            <h3 className="font-medium">Fetch partner DAO list error</h3>
            <div>{error.message}</div>
        </Alert>
    ),
})

export { ListBoundaryPartner }

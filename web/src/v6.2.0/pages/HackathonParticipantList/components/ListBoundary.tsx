import { useEffect, useState } from 'react'
import { useErrorBoundary, withErrorBoundary } from 'react-error-boundary'
import Alert from '../../../../components/Alert'
import Skeleton from '../../../../components/Skeleton'
import { useHackathon, useHackathonVoting } from '../../../hooks/hackathon.hooks'
import { THackathonParticipant } from '../../../types/hackathon.types'
import { ListItem } from './ListItem'

const ListBoundaryInner = (props: { search?: string }) => {
    const { search } = props
    const { hackathon, error } = useHackathon()
    const { showBoundary } = useErrorBoundary()
    const { checked_apps } = useHackathonVoting()
    const [items, setItems] = useState<THackathonParticipant[]>(
        hackathon?.apps_submitted.items || [],
    )

    useEffect(() => {
        if (error) {
            showBoundary(error)
        }
    }, [error])

    useEffect(() => {
        let filtered = hackathon?.apps_submitted.items.filter(({ repo_name }) => {
            return search ? repo_name.startsWith(search.toLowerCase()) : true
        })

        if (hackathon?.is_voting_finished) {
            filtered = filtered?.sort((a, b) => {
                const votes_a = a.application?.votes || 0
                const votes_b = b.application?.votes || 0
                return votes_b - votes_a
            })
        }

        setItems(filtered || [])
    }, [
        hackathon?.apps_submitted.items.length,
        search,
        checked_apps.length,
        hackathon?.is_voting_finished,
    ])

    if (!hackathon?.apps_submitted.is_fetched && hackathon?.apps_submitted.is_fetching) {
        return (
            <Skeleton skeleton={{ height: 48 }} className="py-5">
                <rect x="0" y="0" rx="4" ry="4" width="100%" height="12" />
                <rect x="0" y="18" rx="4" ry="4" width="100%" height="12" />
                <rect x="0" y="36" rx="4" ry="4" width="100%" height="12" />
            </Skeleton>
        )
    }

    return (
        <div className="border border-gray-e6edff rounded-xl overflow-hidden">
            {!items.length && (
                <div className="text-sm text-gray-7c8db5 text-center p-4">
                    There are no participants yet
                </div>
            )}

            <div className="divide-y divide-gray-e6edff">
                {items.map((item, index) => (
                    <ListItem key={index} item={item} index={index} />
                ))}
            </div>
        </div>
    )
}

const ListBoundary = withErrorBoundary(ListBoundaryInner, {
    fallbackRender: ({ error }) => (
        <Alert variant="danger">
            <h3 className="font-medium">Fetch participants error</h3>
            <div>{error.message}</div>
        </Alert>
    ),
})

export { ListBoundary }

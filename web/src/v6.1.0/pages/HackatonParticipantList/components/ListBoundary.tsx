import { useEffect, useState } from 'react'
import { useErrorBoundary, withErrorBoundary } from 'react-error-boundary'
import Alert from '../../../../components/Alert'
import { useHackaton } from '../../../hooks/hackaton.hooks'
import { THackatonParticipant } from '../../../types/hackaton.types'
import { ListItem } from './ListItem'

const ListBoundaryInner = (props: { search?: string }) => {
    const { search } = props
    const hackaton = useHackaton()
    const { showBoundary } = useErrorBoundary()
    const [items, setItems] = useState<THackatonParticipant[]>(
        hackaton.data?.participants || [],
    )

    useEffect(() => {
        if (hackaton.error) {
            showBoundary(hackaton.error)
        }
    }, [hackaton.error])

    useEffect(() => {
        const filtered = hackaton.data?.participants.filter(({ repo_name }) => {
            return search ? repo_name.startsWith(search.toLowerCase()) : true
        })
        setItems(filtered || [])
    }, [hackaton.data?.participants.length, search])

    return (
        <div className="border border-gray-e6edff rounded-xl overflow-hidden">
            {!items.length && (
                <div className="text-sm text-gray-7c8db5 text-center p-4">
                    There are no participants yet
                </div>
            )}

            <div className="divide-y divide-gray-e6edff">
                {items.map((item, index) => (
                    <ListItem key={index} item={item} />
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

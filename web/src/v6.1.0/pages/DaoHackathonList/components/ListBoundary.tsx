import classNames from 'classnames'
import { useEffect } from 'react'
import { useErrorBoundary, withErrorBoundary } from 'react-error-boundary'
import { toast } from 'react-toastify'
import Alert from '../../../../components/Alert'
import { Button } from '../../../../components/Form'
import { ToastError } from '../../../../components/Toast'
import { useDao } from '../../../hooks/dao.hooks'
import { useDaoHackathonList } from '../../../hooks/hackathon.hooks'
import { ListItem, ListItemSkeleton } from './ListItem'

const ListBoundaryInner = (props: { count: number }) => {
    const { count } = props
    const dao = useDao()
    const hackathons = useDaoHackathonList({ initialize: true, count })
    const { showBoundary } = useErrorBoundary()

    const is_fetching = dao.isFetching || hackathons.is_fetching

    const onGetNext = async () => {
        try {
            await hackathons.getNext()
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    useEffect(() => {
        if (hackathons.error) {
            showBoundary(hackathons.error)
        }
    }, [hackathons.error])

    return (
        <div className="border border-gray-e6edff rounded-xl overflow-hidden">
            {is_fetching && !hackathons.items.length && <ListItemSkeleton />}

            {!is_fetching && hackathons.is_empty && (
                <div className="px-5 py-10">
                    <div className="mb-4 w-20 mx-auto">
                        <img src="/images/box-empty.svg" alt="Empty" />
                    </div>
                    <div className="text-sm text-gray-7c8db5 text-center">
                        Your organization does not
                        <br />
                        have Hacks or Grants there
                    </div>
                </div>
            )}

            <div className="divide-y divide-gray-e6edff">
                {hackathons.items.map((item, index) => (
                    <ListItem key={index} dao_name={dao.details.name!} item={item} />
                ))}
            </div>

            {hackathons.has_next && (
                <Button
                    type="button"
                    className={classNames(
                        'w-full',
                        '!rounded-none',
                        '!text-gray-7c8db5 !bg-gray-fafafd',
                        'disabled:opacity-70',
                    )}
                    disabled={hackathons.is_fetching}
                    isLoading={hackathons.is_fetching}
                    onClick={onGetNext}
                >
                    Show more
                </Button>
            )}
        </div>
    )
}

const ListBoundary = withErrorBoundary(ListBoundaryInner, {
    fallbackRender: ({ error }) => (
        <Alert variant="danger">
            <h3 className="font-medium">Fetch hackathons error</h3>
            <div>{error.message}</div>
        </Alert>
    ),
})

export { ListBoundary }

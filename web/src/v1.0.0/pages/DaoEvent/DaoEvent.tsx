import {
    DaoEventVotingForm,
    MemberAddEvent,
    MemberDeleteEvent,
    BranchProtectEvent,
    BranchUnprotectEvent,
    PullRequestEvent,
    DaoUpgradeEvent,
} from './components'
import { Tooltip } from 'react-tooltip'
import { useCallback, useEffect, useRef } from 'react'
import { useDao, useDaoEvent, useDaoEventList, useDaoMember } from '../../hooks/dao.hooks'
import CopyClipboard from '../../../components/CopyClipboard'
import { getDurationDelta, shortString } from '../../../utils'
import { Button } from '../../../components/Form'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { DaoEventProgressBar, DaoEventStatusBadge } from '../../components/DaoEvent'
import { EDaoEventType } from '../../../types/common.types'
import Skeleton from '../../../components/Skeleton'
import { useErrorBoundary, withErrorBoundary } from 'react-error-boundary'
import Alert from '../../../components/Alert'
import { useBodyScrollLock } from '../../../hooks/common.hooks'

const DaoEventPageInner = (props: { address: string }) => {
    const { address } = props
    const dao = useDao()
    const member = useDaoMember()
    const eventList = useDaoEventList()
    const { event, error } = useDaoEvent(address, { loadOnInit: true })
    const { showBoundary } = useErrorBoundary()
    const ref = useRef<HTMLDivElement>(null)
    useBodyScrollLock({
        applyWhen: !!event?.isOpen,
        deps: [event?.isOpen],
        mobileOnly: true,
    })

    const onItemClose = useCallback(() => {
        window.history.replaceState(null, document.title, `/o/${dao.details.name}/events`)
        eventList.closeItems()
    }, [dao.details.name])

    useEffect(() => {
        if (error) {
            showBoundary(error)
        }
    }, [error])

    useEffect(() => {
        const onClick = ({ target }: any) => {
            // If no ref or click inide event block, do nothing
            if (!ref.current || (ref.current && ref.current.contains(target))) {
                return
            }

            // Click outside event block, but need to check click on event list item
            const items = document.getElementsByClassName('dao-eventlist-item')
            const itemClicked = Array.from(items).some((item) => item.contains(target))
            if (!itemClicked) {
                onItemClose()
            }
        }

        document.addEventListener('click', onClick)
        return () => {
            document.removeEventListener('click', onClick)
        }
    }, [onItemClose])

    if (!event) {
        return (
            <Skeleton className="py-2" skeleton={{ height: 114 }}>
                <rect x="0" y="10" rx="6" ry="6" width="100%" height="30" />
                <rect x="0" y="60" rx="6" ry="6" width="100%" height="14" />
                <rect x="0" y="80" rx="6" ry="6" width="100%" height="14" />
                <rect x="0" y="100" rx="6" ry="6" width="100%" height="14" />
            </Skeleton>
        )
    }

    return (
        <div ref={ref}>
            <div className="flex flex-wrap items-center gap-2 border-b border-b-gray-e8eeed pt-2 pb-4 relative">
                <div className="basis-full lg:basis-auto grow">
                    <h3 className="text-xl font-medium">{event.label}</h3>
                </div>
                <div>
                    <div className="flex items-center gap-x-6">
                        <CopyClipboard
                            className="text-sm text-gray-7c8db5"
                            label={
                                <span
                                    data-tooltip-id="common-tip"
                                    data-tooltip-content="Event address"
                                >
                                    {shortString(event.address)}
                                </span>
                            }
                            componentProps={{
                                text: event.address,
                            }}
                        />
                    </div>
                </div>
                <div className="absolute lg:relative right-0 top-0">
                    <Button
                        variant="custom"
                        className="text-gray-7c8db5 hover:text-black"
                        onClick={onItemClose}
                    >
                        <FontAwesomeIcon icon={faTimes} size="lg" />
                    </Button>
                </div>
            </div>

            <div className="mt-8 row flex-wrap">
                <div className="col !basis-full md:!basis-0">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-6">
                            <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                                Status
                            </div>
                            <DaoEventStatusBadge event={event} />
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                                End date
                            </div>
                            <div className="text-sm">
                                {getDurationDelta(event.time.finish)}
                            </div>
                        </div>
                    </div>

                    <hr className="bg-gray-e6edff my-6" />

                    {!event.data && (
                        <Skeleton className="py-2" skeleton={{ height: 54 }}>
                            <rect x="0" y="0" rx="6" ry="6" width="100%" height="14" />
                            <rect x="0" y="20" rx="6" ry="6" width="100%" height="14" />
                            <rect x="0" y="40" rx="6" ry="6" width="100%" height="14" />
                        </Skeleton>
                    )}

                    {event.data && (
                        <div className="overflow-clip">
                            {event.type === EDaoEventType.DAO_MEMBER_ADD && (
                                <MemberAddEvent data={event.data} />
                            )}
                            {event.type === EDaoEventType.DAO_MEMBER_DELETE && (
                                <MemberDeleteEvent data={event.data} />
                            )}
                            {event.type === EDaoEventType.BRANCH_LOCK && (
                                <BranchProtectEvent data={event.data} />
                            )}
                            {event.type === EDaoEventType.BRANCH_UNLOCK && (
                                <BranchUnprotectEvent data={event.data} />
                            )}
                            {event.type === EDaoEventType.PULL_REQUEST && (
                                <PullRequestEvent data={event.data} />
                            )}
                            {event.type === EDaoEventType.DAO_UPGRADE && (
                                <DaoUpgradeEvent data={event.data} />
                            )}
                        </div>
                    )}
                </div>

                <div className="col !basis-full md:!basis-[18rem] lg:!basis-[20.4375rem] !grow-0">
                    <div className="border border-gray-e6edff rounded-xl p-5">
                        <DaoEventProgressBar event={event} />
                    </div>

                    {!event.status.completed && member.isMember && (
                        <div className="mt-5 border border-gray-e6edff rounded-xl p-5">
                            <h3 className="mb-4 text-xl font-medium">Your vote</h3>
                            <DaoEventVotingForm event={event} />
                        </div>
                    )}
                </div>
            </div>
            <Tooltip id="common-tip" clickable />
        </div>
    )
}

const DaoEventPage = withErrorBoundary(DaoEventPageInner, {
    fallbackRender: ({ error }) => (
        <Alert variant="danger">
            <h3 className="font-medium">Fetch DAO event error</h3>
            <div>{error.message}</div>
        </Alert>
    ),
})

export default DaoEventPage

import { Form, Formik } from 'formik'
import { useEffect, useState } from 'react'
import { classNames, ETaskBounty, shortString, useTask } from 'react-gosh'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import CopyClipboard from '../../components/CopyClipboard'
import ToastError from '../../components/Error/ToastError'
import { Button } from '../../components/Form'
import Loader from '../../components/Loader'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import { TaskStatusBadge } from '../Tasks/components'

const TaskPage = () => {
    const { address } = useParams()
    const navigate = useNavigate()
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const { isFetching, details } = useTask(dao.adapter, address!)
    const [cost, setCost] = useState<{
        assigner: number
        reviewer: number
        manager: number
        total: number
    }>({ assigner: 0, reviewer: 0, manager: 0, total: 0 })

    const onTaskDelete = async () => {
        try {
            await dao.adapter.deleteTask({
                repository: details!.repository,
                name: details!.name,
            })
            navigate(`/o/${dao.details.name}/events`)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    const onTaskClaim = async () => {
        try {
            const types = [ETaskBounty.ASSING, ETaskBounty.MANAGER, ETaskBounty.REVIEW]
            await Promise.all(
                types.map(async (type) => {
                    await dao.adapter.receiveTaskBounty({
                        repository: details!.repository,
                        name: details!.name,
                        type,
                    })
                }),
            )
            toast.success('Claim rewards request sent. Check you wallet balance')
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    useEffect(() => {
        if (details?.config) {
            const sumAssign = details.config.assign.reduce(
                (_sum: number, item: any) => _sum + parseInt(item.grant),
                0,
            )
            const sumReview = details.config.review.reduce(
                (_sum: number, item: any) => _sum + parseInt(item.grant),
                0,
            )
            const sumManager = details.config.manager.reduce(
                (_sum: number, item: any) => _sum + parseInt(item.grant),
                0,
            )
            setCost({
                assigner: sumAssign,
                reviewer: sumReview,
                manager: sumManager,
                total: sumAssign + sumReview + sumManager,
            })
        }
    }, [details?.config])

    return (
        <>
            {isFetching && !details && <Loader>Loading task...</Loader>}
            {details && (
                <>
                    <h1 className="mb-8 text-3xl font-medium">{details.name}</h1>
                    <div className="flex flex-wrap gap-4 justify-between">
                        <div className="basis-8/12">
                            <div className="border border-gray-e6edff rounded-xl p-5">
                                <div className="flex flex-col gap-y-4">
                                    <div className="flex flex-wrap gap-3">
                                        <div className="basis-24 text-gray-7c8db5 text-sm">
                                            Repository
                                        </div>
                                        <div>{details.repository}</div>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        <div className="basis-24 text-gray-7c8db5 text-sm">
                                            Status
                                        </div>
                                        <div>
                                            <TaskStatusBadge item={details} />
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-3 text-sm">
                                        <div className="basis-24 text-gray-7c8db5">
                                            Tags
                                        </div>
                                        <div>
                                            {details.tags.map((tag, index) => (
                                                <span
                                                    key={index}
                                                    className={classNames(
                                                        'mx-1 text-gray-7c8db5',
                                                        'border border-gray-e6edff rounded',
                                                        'px-2',
                                                    )}
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-3 text-sm">
                                        <div className="basis-24 text-gray-7c8db5">
                                            Team
                                        </div>
                                        <div>
                                            {!details.team
                                                ? 'Not assigned'
                                                : [
                                                      ...details.team.assigners,
                                                      ...details.team.reviewers,
                                                      ...details.team.managers,
                                                  ]
                                                      .map(({ username }) => username)
                                                      .join(', ')}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-3 text-sm">
                                        <div className="basis-24 text-gray-7c8db5">
                                            Commit
                                        </div>
                                        <div>
                                            {!details.team ? (
                                                'Not assigned'
                                            ) : (
                                                <Link
                                                    to={`/o/${dao.details.name}/r/${details.repository}/commits/${details.team.commit.branch}/${details.team.commit.name}`}
                                                    className="text-blue-348eff"
                                                >
                                                    {shortString(
                                                        details.team.commit.name,
                                                        6,
                                                        0,
                                                        '',
                                                    )}
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-3 text-sm">
                                        <div className="basis-24 text-gray-7c8db5">
                                            Address
                                        </div>
                                        <CopyClipboard
                                            label={shortString(details.address, 6, 6)}
                                            labelClassName="text-gray-7c8db5"
                                            iconContainerClassName="text-gray-7c8db5"
                                            componentProps={{ text: details.address }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="grow">
                            <div className="border border-gray-e6edff rounded-xl overflow-hidden">
                                <div className="p-5">
                                    <div
                                        className={classNames(
                                            'flex flex-wrap justify-between gap-2',
                                            'pb-4 border-b border-gray-e6edff',
                                            'text-xl font-medium',
                                        )}
                                    >
                                        <h3>Reward</h3>
                                        <div>{cost.total}</div>
                                    </div>

                                    <div className="pt-4 flex flex-col gap-y-2">
                                        <div className="flex flex-wrap justify-between gap-2">
                                            <div className="text-gray-7c8db5 text-sm">
                                                Assigner
                                            </div>
                                            <div className="font-medium">
                                                {cost.assigner}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap justify-between gap-2">
                                            <div className="text-gray-7c8db5 text-sm">
                                                Reviewer
                                            </div>
                                            <div className="font-medium">
                                                {cost.reviewer}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap justify-between gap-2">
                                            <div className="text-gray-7c8db5 text-sm">
                                                Manager
                                            </div>
                                            <div className="font-medium">
                                                {cost.manager}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="border-t border-gray-e6edff">
                                    <div className="p-5">
                                        {!details.confirmed && (
                                            <Formik
                                                initialValues={{}}
                                                onSubmit={onTaskDelete}
                                            >
                                                {({ isSubmitting }) => (
                                                    <Form>
                                                        <Button
                                                            type="submit"
                                                            variant="outline-danger"
                                                            className="w-full"
                                                            isLoading={isSubmitting}
                                                            disabled={isSubmitting}
                                                        >
                                                            Delete task
                                                        </Button>
                                                    </Form>
                                                )}
                                            </Formik>
                                        )}

                                        {details.confirmed && (
                                            <Formik
                                                initialValues={{}}
                                                onSubmit={onTaskClaim}
                                            >
                                                {({ isSubmitting }) => (
                                                    <Form>
                                                        <Button
                                                            type="submit"
                                                            className="w-full"
                                                            isLoading={isSubmitting}
                                                            disabled={isSubmitting}
                                                        >
                                                            Claim reward
                                                        </Button>
                                                    </Form>
                                                )}
                                            </Formik>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    )
}

export default TaskPage

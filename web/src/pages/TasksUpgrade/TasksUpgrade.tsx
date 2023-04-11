import { Form, Formik } from 'formik'
import { useReducer } from 'react'
import {
    ESmvEventType,
    executeByChunk,
    getAllAccounts,
    getRepositoryAccounts,
    GoshAdapterFactory,
    GoshError,
    MAX_PARALLEL_READ,
    TTaskTransferParams,
    TTaskUpgradeParams,
} from 'react-gosh'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Button } from '../../components/Form'
import { ToastError, ToastSuccess } from '../../components/Toast'
import { UILog, UILogItem } from '../../components/UILog'
import { TDaoLayoutOutletContext } from '../DaoLayout'

type TProgress = {
    getRepositories?: boolean
    getTasks?: boolean
    upgradeTasks?: boolean
}

const progressInitialState: TProgress = {
    getRepositories: undefined,
    getTasks: undefined,
    upgradeTasks: undefined,
}

const progressReducer = (state: TProgress, action: { type: string; payload: any }) => {
    switch (action.type) {
        case 'get_repositories':
            return { ...state, getRepositories: action.payload }
        case 'get_tasks':
            return { ...state, getTasks: action.payload }
        case 'upgrade_tasks':
            return { ...state, upgradeTasks: action.payload }
        default:
            return progressInitialState
    }
}

const TasksUpgradePage = () => {
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const navigate = useNavigate()
    const [progress, progressDispatch] = useReducer(progressReducer, progressInitialState)

    const _upgrade_from_2 = async () => {
        // Get prev (2.0) DAO adapter
        const ver = '2.0.0'
        const gosh2 = GoshAdapterFactory.create(ver)
        const dao2 = await gosh2.getDao({ name: dao.details.name, useAuth: false })

        // Get all repositories from DAO 2.0 and task code hash for repo
        const repos = await getRepositoryAccounts(dao.details.name, {
            version: ver,
        })
        const taskCodeHashes = await executeByChunk(
            repos,
            MAX_PARALLEL_READ,
            async ({ address }) => {
                const repo = await dao2.getRepository({ address })
                const name = await repo.getName()
                return {
                    repoName: name,
                    taskCodeHash: await dao2.getTaskCodeHash(name),
                }
            },
        )
        progressDispatch({ type: 'get_repositories', payload: true })

        // Get all tasks from DAO 2.0
        const taskDeployCells: { type: number; params: TTaskTransferParams }[] = []
        for (const { repoName, taskCodeHash } of taskCodeHashes) {
            const accounts = await getAllAccounts({
                filters: [`code_hash: {eq:"${taskCodeHash}"}`],
                result: ['id', 'data'],
            })
            const cells = await executeByChunk(
                accounts,
                MAX_PARALLEL_READ,
                async ({ id, data }) => {
                    const task = await dao2.getTask({ address: id })
                    const decoded = await task.account.decodeAccountData(data)
                    return {
                        type: ESmvEventType.TASK_REDEPLOY,
                        params: { accountData: decoded, repoName },
                    }
                },
            )
            taskDeployCells.push(...cells)
        }
        progressDispatch({ type: 'get_tasks', payload: true })

        // Create multi proposal or update flag
        if (taskDeployCells.length > 0) {
            await dao.adapter.createMultiProposal({
                proposals: [
                    ...taskDeployCells,
                    {
                        type: ESmvEventType.TASK_REDEPLOYED,
                        params: {},
                    },
                ],
            })
        } else {
            await dao.adapter.upgradeTaskComplete({ cell: false })
        }
        progressDispatch({ type: 'upgrade_tasks', payload: true })

        return { isEvent: taskDeployCells.length > 0 }
    }

    const _upgrade_from_3 = async () => {
        // Get prev (3.0) DAO adapter
        const ver = '3.0.0'
        const vgosh = GoshAdapterFactory.create(ver)
        const vdao = await vgosh.getDao({ name: dao.details.name, useAuth: false })

        // Get all repositories from DAO 3.0 and task code hash for repo
        const repos = await getRepositoryAccounts(dao.details.name, {
            version: ver,
        })
        const taskCodeHashes = await executeByChunk(
            repos,
            MAX_PARALLEL_READ,
            async ({ address }) => {
                const repo = await vdao.getRepository({ address })
                const name = await repo.getName()
                return {
                    repoName: name,
                    taskCodeHash: await vdao.getTaskCodeHash(name),
                }
            },
        )
        progressDispatch({ type: 'get_repositories', payload: true })

        // Get all tasks from DAO 3.0
        const taskDeployCells: { type: number; params: TTaskUpgradeParams }[] = []
        for (const { repoName, taskCodeHash } of taskCodeHashes) {
            const accounts = await getAllAccounts({
                filters: [`code_hash: {eq:"${taskCodeHash}"}`],
                result: ['id'],
            })
            const cells = await executeByChunk(
                accounts,
                MAX_PARALLEL_READ,
                async ({ id }) => {
                    const task = await vdao.getTask({ address: id })
                    return {
                        type: ESmvEventType.TASK_UPGRADE,
                        params: {
                            repoName,
                            taskName: task.name,
                            taskPrev: {
                                address: task.address,
                                version: task.account.version,
                            },
                            tag: task.tagsRaw,
                        },
                    }
                },
            )
            taskDeployCells.push(...cells)
        }
        progressDispatch({ type: 'get_tasks', payload: true })

        // Create multi proposal or update flag
        if (taskDeployCells.length > 0) {
            await dao.adapter.createMultiProposal({
                proposals: [
                    ...taskDeployCells,
                    {
                        type: ESmvEventType.TASK_REDEPLOYED,
                        params: {},
                    },
                ],
            })
        } else {
            await dao.adapter.upgradeTaskComplete({ cell: false })
        }
        progressDispatch({ type: 'upgrade_tasks', payload: true })

        return { isEvent: taskDeployCells.length > 0 }
    }

    const onTasksUpgrade = async () => {
        try {
            if (dao.details.isTaskRedeployed) {
                throw new GoshError('Tasks have already been upgraded')
            }

            const prevDao = await dao.adapter.getPrevDao()
            if (!prevDao) {
                throw new GoshError('Previous DAO is undefined')
            }

            let isEvent = false
            const prevVersion = prevDao.getVersion()
            if (prevVersion === '2.0.0') {
                const result = await _upgrade_from_2()
                isEvent = result.isEvent
            } else {
                const result = await _upgrade_from_3()
                isEvent = result.isEvent
            }

            toast.success(
                <ToastSuccess
                    message={{
                        title: isEvent ? 'Event created' : 'Tasks upgraded',
                        content: isEvent ? 'Tasks upgrade event created' : undefined,
                    }}
                />,
            )
            navigate(isEvent ? `/o/${dao.details.name}/events` : `/o/${dao.details.name}`)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <>
            <h1 className="font-medium text-xl mb-4">Upgrade tasks</h1>

            <div className="border rounded-xl border-gray-e6edff p-5">
                <Formik initialValues={{}} onSubmit={onTasksUpgrade}>
                    {({ isSubmitting }) => (
                        <Form>
                            <Button
                                type="submit"
                                isLoading={isSubmitting}
                                disabled={isSubmitting}
                            >
                                Start tasks upgrade
                            </Button>

                            {isSubmitting && (
                                <div className="mt-4">
                                    <UILog>
                                        <UILogItem result={progress.getRepositories}>
                                            Get repositories...
                                        </UILogItem>
                                        <UILogItem result={progress.getTasks}>
                                            Get tasks...
                                        </UILogItem>
                                        <UILogItem result={progress.upgradeTasks}>
                                            Upgrade tasks...
                                        </UILogItem>
                                    </UILog>
                                </div>
                            )}
                        </Form>
                    )}
                </Formik>
            </div>
        </>
    )
}

export default TasksUpgradePage

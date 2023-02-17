import { Form, Formik } from 'formik'
import { useReducer } from 'react'
import {
    executeByChunk,
    getRepositoryAccounts,
    GoshAdapterFactory,
    GoshError,
    MAX_PARALLEL_READ,
    MAX_PARALLEL_WRITE,
    splitByChunk,
    TAddress,
} from 'react-gosh'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { toast } from 'react-toastify'
import ToastError from '../../components/Error/ToastError'
import { Button } from '../../components/Form'
import { UILog, UILogItem } from '../../components/UILog'
import { TDaoLayoutOutletContext } from '../DaoLayout'

type TProgress = {
    getRepositories?: boolean
    prepareRepositories?: boolean
    createProposals?: boolean
    updateDao?: boolean
}

const progressInitialState: TProgress = {
    getRepositories: undefined,
    prepareRepositories: undefined,
    createProposals: undefined,
    updateDao: undefined,
}

const progressReducer = (state: TProgress, action: { type: string; payload: any }) => {
    switch (action.type) {
        case 'get_repositories':
            return { ...state, getRepositories: action.payload }
        case 'prepare_repositories':
            return { ...state, prepareRepositories: action.payload }
        case 'create_proposals':
            return { ...state, createProposals: action.payload }
        case 'update_dao':
            return { ...state, updateDao: action.payload }
        default:
            return progressInitialState
    }
}

const ReposUpgradePage = () => {
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const navigate = useNavigate()
    const [progress, progressDispatch] = useReducer(progressReducer, progressInitialState)

    const onRepositoriesUpgrade = async () => {
        try {
            // Check DAO flag
            if (await dao.adapter.isRepositoriesUpgraded()) {
                throw new GoshError(
                    'It seems, that repostories upgrade has been executed, please, check DAO events',
                )
            }

            // Get repositories to be upgraded
            const accounts = await getRepositoryAccounts(dao.details.name, {})
            const items = await executeByChunk(
                accounts,
                MAX_PARALLEL_READ,
                async ({ address, version }) => {
                    const gosh = GoshAdapterFactory.create(version)
                    const repository = await gosh.getRepository({ address })
                    const name = await repository.getName()
                    return { address, name, version }
                },
            )
            progressDispatch({ type: 'get_repositories', payload: true })

            const current = items
                .filter(({ version }) => version === dao.details.version)
                .map(({ name }) => name)
            const rest = items.filter(({ version }) => version !== dao.details.version)
            const upgrade: { name: string; address: TAddress; version: string }[] = []
            for (const { name, address, version } of rest) {
                if (current.indexOf(name) >= 0) {
                    continue
                }
                if (upgrade.findIndex((item) => item.name === name) >= 0) {
                    continue
                }
                upgrade.push({ name, address, version })
            }
            progressDispatch({ type: 'prepare_repositories', payload: true })
            console.debug('Upgrade', upgrade)

            // Create proposal/multiproposals for deploy repositories
            const params = upgrade.map(({ name, address, version }) => ({
                name,
                prev: { addr: address, version },
            }))
            console.debug('Params', params)
            if (params.length === 1) {
                await dao.adapter.createRepository(params[0])
            } else if (params.length > 1) {
                await executeByChunk(
                    splitByChunk(params, 50),
                    MAX_PARALLEL_WRITE,
                    async (chunk) => {
                        await dao.adapter.createMultiProposal({
                            proposals: chunk.map((p) => ({
                                fn: 'CREATE_REPOSITORY',
                                params: p,
                            })),
                        })
                    },
                )
            }
            progressDispatch({ type: 'create_proposals', payload: true })

            // Set DAO repositories upgrade flag
            await dao.adapter.setRepositoriesUpgraded()
            progressDispatch({ type: 'update_dao', payload: true })
            progressDispatch({ type: 'reset', payload: null })

            navigate(`/o/${dao.details.name}/events`)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <>
            <h1 className="font-medium text-xl mb-4">Upgrade repositories</h1>
            <Formik initialValues={{}} onSubmit={onRepositoriesUpgrade}>
                {({ isSubmitting }) => (
                    <Form>
                        <Button
                            type="submit"
                            isLoading={isSubmitting}
                            disabled={isSubmitting}
                        >
                            Start repositories upgrade
                        </Button>

                        {isSubmitting && (
                            <div className="mt-4">
                                <UILog>
                                    <UILogItem result={progress.getRepositories}>
                                        Get repositories...
                                    </UILogItem>
                                    <UILogItem result={progress.prepareRepositories}>
                                        Prepare repositories...
                                    </UILogItem>
                                    <UILogItem result={progress.createProposals}>
                                        Create proposal(s)...
                                    </UILogItem>
                                    <UILogItem result={progress.updateDao}>
                                        Update DAO...
                                    </UILogItem>
                                </UILog>
                            </div>
                        )}
                    </Form>
                )}
            </Formik>
        </>
    )
}

export default ReposUpgradePage

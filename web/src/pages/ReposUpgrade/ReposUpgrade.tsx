import { Form, Formik } from 'formik'
import { useReducer, useState } from 'react'
import {
    classNames,
    ESmvEventType,
    executeByChunk,
    getRepositoryAccounts,
    GoshAdapterFactory,
    GoshError,
    MAX_PARALLEL_READ,
    MAX_PARALLEL_WRITE,
    splitByChunk,
    TAddress,
    TCommitTag,
} from 'react-gosh'
import { IGoshRepositoryAdapter } from 'react-gosh/dist/gosh/interfaces'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { toast } from 'react-toastify'
import ToastError from '../../components/Error/ToastError'
import { Button, Checkbox } from '../../components/Form'
import { UILog, UILogItem } from '../../components/UILog'
import { TDaoLayoutOutletContext } from '../DaoLayout'

type TProgress = {
    createTags?: boolean
    createProposals?: boolean
    updateDao?: boolean
}

const progressInitialState: TProgress = {
    createTags: undefined,
    createProposals: undefined,
    updateDao: undefined,
}

const progressReducer = (state: TProgress, action: { type: string; payload: any }) => {
    switch (action.type) {
        case 'create_tags':
            return { ...state, createTags: action.payload }
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
    const [upgrade, setUpgrade] = useState<{
        isFetching: boolean
        items: {
            adapter: IGoshRepositoryAdapter
            address: TAddress
            name: string
            version: string
            tags: {
                isFetching: boolean
                isLoaded: boolean
                items: TCommitTag[]
                selected: TCommitTag[]
            }
        }[]
    }>({
        isFetching: false,
        items: [],
    })
    const [progress, progressDispatch] = useReducer(progressReducer, progressInitialState)

    const getRepositories = async () => {
        setUpgrade((state) => ({ ...state, items: [], isFetching: true }))

        // Get repositories to be upgraded
        const accounts = await getRepositoryAccounts(dao.details.name, {})
        const items = await executeByChunk(
            accounts,
            MAX_PARALLEL_READ,
            async ({ address, version }) => {
                const gosh = GoshAdapterFactory.create(version)
                const repository = await gosh.getRepository({ address })
                const name = await repository.getName()
                return { adapter: repository, address, name, version }
            },
        )

        const current = items
            .filter(({ version }) => version === dao.details.version)
            .map(({ name }) => name)
        const rest = items.filter(({ version }) => version !== dao.details.version)
        const upgradeable: {
            adapter: IGoshRepositoryAdapter
            name: string
            address: TAddress
            version: string
        }[] = []
        for (const item of rest) {
            if (current.indexOf(item.name) >= 0) {
                continue
            }
            if (upgradeable.findIndex((i) => i.name === item.name) >= 0) {
                continue
            }
            upgradeable.push(item)
        }

        if (!upgradeable.length) {
            await dao.adapter.setRepositoriesUpgraded()
            toast.success(
                <>
                    <h3 className="font-semibold">No repositories to upgrade</h3>
                    <p className="text-sm">DAO was updated successfully</p>
                </>,
            )
            navigate(`/o/${dao.details.name}`)
        }

        setUpgrade((state) => ({
            ...state,
            items: upgradeable.map((item) => ({
                ...item,
                tags: { isFetching: false, isLoaded: false, items: [], selected: [] },
            })),
            isFetching: false,
        }))
    }

    const getTags = async (index: number, repository: IGoshRepositoryAdapter) => {
        setUpgrade((state) => ({
            ...state,
            items: state.items.map((item, i) => {
                if (i !== index) {
                    return item
                }
                return { ...item, tags: { ...item.tags, isFetching: true } }
            }),
        }))
        const tags = await repository.getCommitTags()
        setUpgrade((state) => ({
            ...state,
            items: state.items.map((item, i) => {
                if (i !== index) {
                    return item
                }
                return {
                    ...item,
                    tags: {
                        ...item.tags,
                        items: tags,
                        isLoaded: true,
                        isFetching: false,
                    },
                }
            }),
        }))
    }

    const onTagClick = (index: number, tag: TCommitTag, checked: boolean) => {
        setUpgrade((state) => ({
            ...state,
            items: state.items.map((item, i) => {
                if (i !== index) {
                    return item
                }

                let selected = item.tags.selected
                if (checked) {
                    selected.push(tag)
                } else {
                    selected = selected.filter((t) => t.name !== tag.name)
                }

                return { ...item, tags: { ...item.tags, selected, isFetching: false } }
            }),
        }))
    }

    const onRepositoriesUpgrade = async () => {
        try {
            // Check DAO flag
            if (await dao.adapter.isRepositoriesUpgraded()) {
                throw new GoshError(
                    'It seems, that repostories upgrade has been executed, please, check DAO events',
                )
            }

            console.debug('Upgrade', upgrade)
            // Deploy tags
            const tags: TCommitTag[] = []
            for (const item of upgrade.items) {
                tags.push(...item.tags.selected)
            }
            console.debug('Tags', tags)
            await executeByChunk(tags, MAX_PARALLEL_WRITE, async (item) => {
                // TODO: Move this to DAO adapter
                await dao.adapter.wallet?.run('deployTag', {
                    repoName: item.repository,
                    nametag: item.name,
                    nameCommit: item.commit.name,
                    content: item.content,
                    commit: item.commit.address,
                })
            })
            progressDispatch({ type: 'create_tags', payload: true })

            // Create proposal/multiproposals for deploy repositories
            const params = upgrade.items.map(({ name, address, version }) => ({
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
                                type: ESmvEventType.REPO_CREATE,
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

            <div className="border rounded-xl border-gray-e6edff px-5">
                <div className="divide-y divide-gray-e6edff">
                    {upgrade.items.map((item, index) => (
                        <div key={index} className="py-3">
                            <div className="text-lg font-medium">{item.name}</div>
                            <div className="mt-2">
                                {!item.tags.isLoaded && (
                                    <Button
                                        className={classNames(
                                            '!bg-transparent !text-gray-7c8db5 !text-sm',
                                            'px-0',
                                        )}
                                        isLoading={item.tags.isFetching}
                                        disabled={item.tags.isFetching}
                                        onClick={() => getTags(index, item.adapter)}
                                    >
                                        Load tags
                                    </Button>
                                )}
                                {item.tags.isLoaded && !item.tags.items.length && (
                                    <div className="text-gray-7c8db5 text-sm">
                                        Repository has no commit tags
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-x-5 gap-y-3">
                                    {item.tags.items.map((tag, j) => (
                                        <div key={j}>
                                            <Checkbox
                                                label={tag.content}
                                                checked={
                                                    item.tags.selected.findIndex(
                                                        (t) => t.name === tag.name,
                                                    ) >= 0
                                                }
                                                onChange={(e) => {
                                                    onTagClick(
                                                        index,
                                                        tag,
                                                        e.target.checked,
                                                    )
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="py-5">
                    {!upgrade.items.length && (
                        <Button
                            isLoading={upgrade.isFetching}
                            disabled={upgrade.isFetching}
                            onClick={getRepositories}
                        >
                            Get repositories
                        </Button>
                    )}

                    {!!upgrade.items.length && (
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
                                                <UILogItem result={progress.createTags}>
                                                    Create tags...
                                                </UILogItem>
                                                <UILogItem
                                                    result={progress.createProposals}
                                                >
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
                    )}
                </div>
            </div>
        </>
    )
}

export default ReposUpgradePage

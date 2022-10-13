import { useState } from 'react'
import { faArrowRight, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useMonaco } from '@monaco-editor/react'
import { Field, Form, Formik } from 'formik'
import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useRecoilValue } from 'recoil'
import BlobDiffPreview from '../../components/Blob/DiffPreview'
import { TRepoLayoutOutletContext } from '../RepoLayout'
import * as Yup from 'yup'
import FormCommitBlock from '../BlobCreate/FormCommitBlock'
import Spinner from '../../components/Spinner'
import SwitchField from '../../components/FormikForms/SwitchField'
import { useCommitProgress, useSmvBalance } from '../../hooks/gosh.hooks'
import {
    userAtom,
    getCodeLanguageFromFilename,
    splitByChunk,
    EGoshError,
    GoshError,
    sleep,
    retry,
    getTreeItemFullPath,
    useRepoBranches,
} from 'react-gosh'
import BranchSelect from '../../components/BranchSelect'
import { toast } from 'react-toastify'
import { Buffer } from 'buffer'
import ToastError from '../../components/Error/ToastError'
import { IGoshRepositoryAdapter } from 'react-gosh/dist/gosh/interfaces'
import { TBranch, TTreeItem } from 'react-gosh/dist/types/repo.types'

type TCommitFormValues = {
    title: string
    message?: string
    tags: string
    deleteBranch?: boolean
}

const PullCreatePage = () => {
    const userState = useRecoilValue(userAtom)
    const { daoName, repoName } = useParams()
    const navigate = useNavigate()
    const { dao, repo } = useOutletContext<TRepoLayoutOutletContext>()
    const monaco = useMonaco()
    const { details: smvDetails } = useSmvBalance(
        dao.adapter,
        dao.details.isAuthenticated,
    )
    const { branches, updateBranches } = useRepoBranches(repo)
    const [compare, setCompare] = useState<
        | {
              to?: { treePath: string; content: any }
              from: { treePath: string; content: any }
              showDiff?: boolean
          }[]
        | undefined
    >([])
    const [compareBranches, setCompareBranches] = useState<{
        fromBranch?: TBranch
        toBranch?: TBranch
    }>({
        fromBranch: branches.find((branch) => branch.name === 'main'),
        toBranch: branches.find((branch) => branch.name === 'main'),
    })
    const [blobProgress, setBlobProgress] = useState<{
        count: number
        total: number
    }>({ count: 0, total: 0 })
    const { progress, progressCallback } = useCommitProgress()

    const getBlob = async (
        repo: IGoshRepositoryAdapter,
        branch: TBranch,
        item: TTreeItem,
    ): Promise<string | Buffer> => {
        const treepath = getTreeItemFullPath(item)
        return await repo.getBlob({ fullpath: `${branch.name}/${treepath}` })
    }

    const buildDiff = async (branches: { fromBranch: TBranch; toBranch: TBranch }) => {
        const { fromBranch, toBranch } = branches
        if (fromBranch.commit.address === toBranch.commit.address) {
            setCompare([])
            return
        }

        const fromTree = await repo.getTree(fromBranch.commit.name)
        const fromTreeItems = [...fromTree.items].filter(
            (item) => ['blob', 'blobExecutable', 'link'].indexOf(item.type) >= 0,
        )
        console.debug('[Pull create] - From tree blobs:', fromTreeItems)
        const toTree = await repo.getTree(toBranch.commit.name)
        const toTreeItems = [...toTree.items].filter(
            (item) => ['blob', 'blobExecutable', 'link'].indexOf(item.type) >= 0,
        )
        console.debug('[Pull create] - To tree blobs:', toTreeItems)
        // Find items that exist in both trees and were changed
        const intersected = toTreeItems.filter((item) => {
            return fromTreeItems.find(
                (fItem) =>
                    fItem.path === item.path &&
                    fItem.name === item.name &&
                    fItem.sha1 !== item.sha1,
            )
        })
        console.debug('[Pull crreate] - Intersected:', intersected)
        // Find items that where added by `fromBranch`
        const added = fromTreeItems.filter((item) => {
            return !toTreeItems.find(
                (tItem) => tItem.path === item.path && tItem.name === item.name,
            )
        })
        console.debug('[Pull crreate] - Added:', added)
        setBlobProgress({
            count: 0,
            total: intersected.length + added.length,
        })

        // Merge intersected and added and generate compare list
        const compare: {
            to?: { treePath: string; content: any }
            from: { treePath: string; content: any }
            showDiff?: boolean
        }[] = []

        for (const chunk of splitByChunk(intersected, 5)) {
            await Promise.all(
                chunk.map(async (item) => {
                    const fromItem = fromTreeItems.find(
                        (fItem) => fItem.path === item.path && fItem.name === item.name,
                    )
                    const toItem = toTreeItems.find(
                        (tItem) => tItem.path === item.path && tItem.name === item.name,
                    )
                    if (fromItem && toItem) {
                        const fromBlob = await getBlob(repo, fromBranch, fromItem)
                        const toBlob = await getBlob(repo, toBranch, toItem)
                        compare.push({
                            to: {
                                treePath: getTreeItemFullPath(toItem),
                                content: toBlob,
                            },
                            from: {
                                treePath: getTreeItemFullPath(fromItem),
                                content: fromBlob,
                            },
                            showDiff:
                                compare.length < 10 ||
                                Buffer.isBuffer(toBlob) ||
                                Buffer.isBuffer(fromBlob),
                        })
                    }
                    setBlobProgress((currVal) => ({
                        ...currVal,
                        count: currVal?.count + 1,
                    }))
                }),
            )
            await sleep(300)
        }

        for (const chunk of splitByChunk(added, 10)) {
            await Promise.all(
                chunk.map(async (item) => {
                    const fromBlob = await getBlob(repo, fromBranch, item)
                    compare.push({
                        to: undefined,
                        from: { treePath: getTreeItemFullPath(item), content: fromBlob },
                        showDiff: compare.length < 10 || Buffer.isBuffer(fromBlob),
                    })
                    setBlobProgress((currVal) => ({
                        ...currVal,
                        count: currVal?.count + 1,
                    }))
                }),
            )
            await sleep(300)
        }

        console.debug('[Pull create] - Compare list:', compare)
        setCompare(compare)
        setBlobProgress({ count: 0, total: 0 })
    }

    const setShowDiff = (i: number) =>
        setCompare((currVal) =>
            currVal?.map((item, index) => {
                if (i === index) return { ...item, showDiff: true }
                return item
            }),
        )

    const onBuildDiff = async () => {
        setCompare(undefined)
        const { fromBranch, toBranch } = compareBranches
        try {
            if (!fromBranch?.commit.address || !toBranch?.commit.address) {
                throw new GoshError(EGoshError.NO_BRANCH)
            }
            await retry(() => buildDiff({ fromBranch, toBranch }), 3)
        } catch (e: any) {
            setCompare([])
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    const onCommitMerge = async (values: TCommitFormValues) => {
        const { fromBranch, toBranch } = compareBranches
        try {
            if (!userState.keys) throw new GoshError(EGoshError.USER_KEYS_UNDEFINED)
            if (!repoName) throw new GoshError(EGoshError.NO_REPO)
            if (!fromBranch || !toBranch) throw new GoshError(EGoshError.NO_BRANCH)
            if (fromBranch.name === toBranch.name || !compare?.length) {
                throw new GoshError(EGoshError.PR_NO_MERGE)
            }

            // Prepare blobs
            const blobs = compare
                .filter(({ from }) => !!from.treePath)
                .map(({ from, to }) => {
                    return {
                        treePath: from.treePath,
                        modified: from.content ?? '',
                        original: to?.content,
                    }
                })
            console.debug('Blobs', blobs)

            if (toBranch.isProtected) {
                if (smvDetails.smvBusy) throw new GoshError(EGoshError.SMV_LOCKER_BUSY)
                if (smvDetails.smvBalance < 20)
                    throw new GoshError(EGoshError.SMV_NO_BALANCE, { min: 20 })
            }

            const message = [values.title, values.message].filter((v) => !!v).join('\n\n')
            await repo.push(
                toBranch.name,
                blobs,
                message,
                values.tags,
                fromBranch.name,
                progressCallback,
            )

            // Delete branch after merge (if selected), update branches, redirect
            if (values.deleteBranch) {
                await retry(() => repo.deleteBranch(fromBranch.name), 3)
            }
            await updateBranches()
            navigate(
                toBranch.isProtected
                    ? `/o/${daoName}/events`
                    : `/o/${daoName}/r/${repoName}/tree/${toBranch.name}`,
                { replace: true },
            )
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    if (!dao.details.isAuthenticated) {
        return <Navigate to={`/o/${daoName}/r/${repoName}`} />
    }
    return (
        <div className="bordered-block px-7 py-8">
            <div className="flex items-center gap-x-4">
                <BranchSelect
                    branch={compareBranches?.fromBranch}
                    branches={branches}
                    onChange={(selected) => {
                        !!selected &&
                            setCompareBranches((currVal) => ({
                                ...currVal,
                                fromBranch: selected,
                            }))
                    }}
                />
                <span>
                    <FontAwesomeIcon icon={faChevronRight} size="sm" />
                </span>
                <BranchSelect
                    branch={compareBranches?.toBranch}
                    branches={branches}
                    onChange={(selected) => {
                        !!selected &&
                            setCompareBranches((currVal) => ({
                                ...currVal,
                                toBranch: selected,
                            }))
                    }}
                />
                <button
                    className="btn btn--body px-3 !py-1.5 !text-sm"
                    disabled={compare === undefined}
                    onClick={onBuildDiff}
                >
                    Compare
                </button>
            </div>

            <div className="mt-5">
                {compare === undefined && (
                    <div className="text-sm text-gray-606060">
                        <Spinner className="mr-3" />
                        Loading diff... ({blobProgress.count} / {blobProgress.total})
                    </div>
                )}

                {compare && !compare.length && (
                    <div className="text-sm text-gray-606060 text-center">
                        There is nothing to merge
                    </div>
                )}

                {!!compare?.length && (
                    <>
                        <div className="text-lg">
                            Merge branch
                            <span className="font-semibold mx-2">
                                {compareBranches.fromBranch?.name}
                            </span>
                            <FontAwesomeIcon icon={faArrowRight} size="sm" />
                            <span className="font-semibold ml-2">
                                {compareBranches.toBranch?.name}
                            </span>
                        </div>

                        {compare.map(({ to, from, showDiff }, index) => {
                            const treePath = to?.treePath || from.treePath
                            if (!treePath) return null

                            const language = getCodeLanguageFromFilename(monaco, treePath)
                            return (
                                <div
                                    key={index}
                                    className="my-5 border rounded overflow-hidden"
                                >
                                    <div className="bg-gray-100 border-b px-3 py-1.5 text-sm font-semibold">
                                        {treePath}
                                    </div>
                                    {showDiff ? (
                                        <BlobDiffPreview
                                            original={to?.content}
                                            modified={from?.content}
                                            modifiedLanguage={language}
                                        />
                                    ) : (
                                        <button
                                            className="!block btn btn--body !text-sm mx-auto px-3 py-1.5 my-2"
                                            onClick={() => setShowDiff(index)}
                                        >
                                            Load diff
                                        </button>
                                    )}
                                </div>
                            )
                        })}

                        <div className="mt-5">
                            <Formik
                                initialValues={{
                                    title: `Merge branch '${compareBranches.fromBranch?.name}' into '${compareBranches.toBranch?.name}'`,
                                    tags: '',
                                }}
                                onSubmit={onCommitMerge}
                                validationSchema={Yup.object().shape({
                                    title: Yup.string().required('Field is required'),
                                })}
                            >
                                {({ isSubmitting }) => (
                                    <Form>
                                        <FormCommitBlock
                                            isDisabled={!monaco || isSubmitting}
                                            isSubmitting={isSubmitting}
                                            extraButtons={
                                                !compareBranches.fromBranch
                                                    ?.isProtected && (
                                                    <Field
                                                        name="deleteBranch"
                                                        component={SwitchField}
                                                        className="ml-4"
                                                        label="Delete branch after merge"
                                                        labelClassName="text-sm text-gray-505050"
                                                    />
                                                )
                                            }
                                            progress={progress}
                                        />
                                    </Form>
                                )}
                            </Formik>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default PullCreatePage

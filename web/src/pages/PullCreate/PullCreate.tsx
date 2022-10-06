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
import {
    useCommitProgress,
    useGoshRepoBranches,
    useSmvBalance,
} from '../../hooks/gosh.hooks'
import {
    TGoshBranch,
    TGoshTreeItem,
    userAtom,
    getCodeLanguageFromFilename,
    getRepoTree,
    splitByChunk,
    EGoshError,
    GoshError,
    sleep,
    retry,
} from 'react-gosh'
import BranchSelect from '../../components/BranchSelect'
import { toast } from 'react-toastify'
import { Buffer } from 'buffer'
import ToastError from '../../components/Error/ToastError'
import { GoshCommit } from 'react-gosh/dist/gosh/0.11.0/goshcommit'
import { GoshSnapshot } from 'react-gosh/dist/gosh/0.11.0/goshsnapshot'
import { IGoshRepository, IGoshWallet } from 'react-gosh/dist/gosh/interfaces'

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
    const { repo, wallet } = useOutletContext<TRepoLayoutOutletContext>()
    const monaco = useMonaco()
    const smvBalance = useSmvBalance(wallet)
    const { branches, updateBranches } = useGoshRepoBranches(repo)
    const [compare, setCompare] = useState<
        | {
              to?: { item: TGoshTreeItem; blob: any }
              from: { item: TGoshTreeItem; blob: any }
              showDiff?: boolean
          }[]
        | undefined
    >([])
    const [compareBranches, setCompareBranches] = useState<{
        fromBranch?: TGoshBranch
        toBranch?: TGoshBranch
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
        wallet: IGoshWallet,
        repo: IGoshRepository,
        branch: TGoshBranch,
        item: TGoshTreeItem,
    ): Promise<{ content: string | Buffer; isIpfs: boolean }> => {
        const commit = new GoshCommit(wallet.account.client, branch.commitAddr)
        const commitName = await commit.getName()

        const filename = `${item.path ? `${item.path}/` : ''}${item.name}`
        const snapAddr = await repo.getSnapshotAddr(branch.name, filename)
        const snap = new GoshSnapshot(wallet.account.client, snapAddr)
        const data = await snap.getSnapshot(commitName, item)
        return data
    }

    const buildDiff = async (
        wallet: IGoshWallet,
        branches: { fromBranch: TGoshBranch; toBranch: TGoshBranch },
    ) => {
        const { fromBranch, toBranch } = branches
        if (fromBranch.commitAddr === toBranch.commitAddr) {
            setCompare([])
            return
        }

        const fromTree = await getRepoTree(repo, fromBranch.commitAddr)
        const fromTreeItems = [...fromTree.items].filter(
            (item) => ['blob', 'blobExecutable', 'link'].indexOf(item.type) >= 0,
        )
        console.debug('[Pull create] - From tree blobs:', fromTreeItems)
        const toTree = await getRepoTree(repo, toBranch.commitAddr)
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
            to?: { item: TGoshTreeItem; blob: any }
            from: { item: TGoshTreeItem; blob: any }
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
                        const fromBlob = await getBlob(wallet, repo, fromBranch, fromItem)
                        const toBlob = await getBlob(wallet, repo, toBranch, toItem)
                        compare.push({
                            to: { item: toItem, blob: toBlob },
                            from: { item: fromItem, blob: fromBlob },
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
                    const fromBlob = await getBlob(wallet, repo, fromBranch, item)
                    compare.push({
                        to: undefined,
                        from: { item, blob: fromBlob },
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
            if (!wallet) throw new GoshError(EGoshError.NO_WALLET)
            if (!fromBranch?.commitAddr || !toBranch?.commitAddr) {
                throw new GoshError(EGoshError.NO_BRANCH)
            }
            await retry(() => buildDiff(wallet.instance, { fromBranch, toBranch }), 3)
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
            if (!wallet) throw new GoshError(EGoshError.NO_WALLET)
            if (!repoName) throw new GoshError(EGoshError.NO_REPO)
            if (!fromBranch || !toBranch) throw new GoshError(EGoshError.NO_BRANCH)
            if (fromBranch.name === toBranch.name || !compare?.length) {
                throw new GoshError(EGoshError.PR_NO_MERGE)
            }

            // Prepare blobs
            const blobs = compare
                .filter(({ from }) => !!from.item)
                .map(({ from, to }) => {
                    return {
                        name: `${from.item.path ? `${from.item.path}/` : ''}${
                            from.item.name
                        }`,
                        modified: from.blob.content ?? '',
                        original: to?.blob.content,
                        isIpfs: from.blob.isIpfs || to?.blob.isIpfs,
                        treeItem: from.item,
                    }
                })
            console.debug('Blobs', blobs)

            if (toBranch.isProtected) {
                if (smvBalance.smvBusy) throw new GoshError(EGoshError.SMV_LOCKER_BUSY)
                if (smvBalance.smvBalance < 20)
                    throw new GoshError(EGoshError.SMV_NO_BALANCE, { min: 20 })
            }

            const message = [values.title, values.message].filter((v) => !!v).join('\n\n')
            const pubkey = userState.keys.public
            await retry(
                () =>
                    wallet.instance.createCommit(
                        repo,
                        toBranch,
                        pubkey,
                        blobs,
                        message,
                        values.tags,
                        fromBranch,
                        progressCallback,
                    ),
                3,
            )

            // Delete branch after merge (if selected), update branches, redirect
            if (values.deleteBranch) {
                await retry(() => wallet.instance.deleteBranch(repo, fromBranch.name), 3)
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

    if (!wallet) return <Navigate to={`/o/${daoName}/r/${repoName}`} />
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
                            const item = to?.item || from?.item
                            const fileName = `${item.path ? `${item.path}/` : ''}${
                                item.name
                            }`
                            if (!fileName) return null

                            const language = getCodeLanguageFromFilename(monaco, fileName)
                            return (
                                <div
                                    key={index}
                                    className="my-5 border rounded overflow-hidden"
                                >
                                    <div className="bg-gray-100 border-b px-3 py-1.5 text-sm font-semibold">
                                        {fileName}
                                    </div>
                                    {showDiff ? (
                                        <BlobDiffPreview
                                            original={to?.blob.content}
                                            modified={from?.blob.content}
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

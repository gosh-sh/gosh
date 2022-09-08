import { useEffect, useState } from 'react'
import { faArrowRight, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useMonaco } from '@monaco-editor/react'
import { Field, Form, Formik } from 'formik'
import {
    Navigate,
    useNavigate,
    useOutletContext,
    useParams,
    useSearchParams,
} from 'react-router-dom'
import { useRecoilValue } from 'recoil'
import BlobDiffPreview from '../../components/Blob/DiffPreview'
import { goshCurrBranchSelector } from '../../store/gosh.state'
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
    IGoshRepository,
    IGoshWallet,
    TGoshBranch,
    TGoshTreeItem,
    userStateAtom,
    getCodeLanguageFromFilename,
    getRepoTree,
    splitByChunk,
    EGoshError,
    GoshError,
    GoshCommit,
    GoshSnapshot,
    sleep,
    useGoshVersions,
} from 'react-gosh'
import BranchSelect from '../../components/BranchSelect'
import { toast } from 'react-toastify'
import { Buffer } from 'buffer'

type TCommitFormValues = {
    title: string
    message?: string
    tags: string
    deleteBranch?: boolean
}

const PullCreatePage = () => {
    const [searchParams] = useSearchParams()
    const userState = useRecoilValue(userStateAtom)
    const { daoName, repoName } = useParams()
    const navigate = useNavigate()
    const { repo, wallet } = useOutletContext<TRepoLayoutOutletContext>()
    const monaco = useMonaco()
    const smvBalance = useSmvBalance(wallet)
    const { branches, updateBranches } = useGoshRepoBranches(repo)
    const { versions } = useGoshVersions()
    const [compare, setCompare] = useState<
        {
            to?: { item: TGoshTreeItem; blob: any }
            from: { item: TGoshTreeItem; blob: any }
            showDiff?: boolean
        }[]
    >()
    const [blobProgress, setBlobProgress] = useState<{
        count: number
        total: number
    }>({ count: 0, total: 0 })

    const compareParam = searchParams.get('compare') || 'main...main'
    const branchFrom = useRecoilValue(
        goshCurrBranchSelector(compareParam.split('...')[0]),
    )
    const branchTo = useRecoilValue(goshCurrBranchSelector(compareParam.split('...')[1]))
    const [localBranches, setlocalBranches] = useState<{
        from?: TGoshBranch
        to?: TGoshBranch
    }>({ from: branchFrom, to: branchTo })
    const { progress, progressCallback } = useCommitProgress()

    const setShowDiff = (i: number) =>
        setCompare((currVal) =>
            currVal?.map((item, index) => {
                if (i === index) return { ...item, showDiff: true }
                return item
            }),
        )

    useEffect(() => {
        const getBlob = async (
            wallet: IGoshWallet,
            repo: IGoshRepository,
            branch: TGoshBranch,
            item: TGoshTreeItem,
        ): Promise<{ content: string | Buffer; isIpfs: boolean }> => {
            const commit = new GoshCommit(
                wallet.account.client,
                branch.commitAddr,
                versions.latest,
            )
            const commitName = await commit.getName()

            const filename = `${item.path ? `${item.path}/` : ''}${item.name}`
            const snapAddr = await repo.getSnapshotAddr(branch.name, filename)
            const snap = new GoshSnapshot(
                wallet.account.client,
                snapAddr,
                versions.latest,
            )
            const data = await snap.getSnapshot(commitName, item)
            return data
        }

        const onCompare = async (wallet: IGoshWallet, repo: IGoshRepository) => {
            try {
                const [branchFromName, branchToName] = compareParam.split('...')
                const branchFrom = await repo.getBranch(branchFromName)
                const branchTo = await repo.getBranch(branchToName)
                if (!branchFrom?.commitAddr || !branchTo?.commitAddr)
                    throw new GoshError(EGoshError.NO_BRANCH)
                if (branchFrom.commitAddr === branchTo.commitAddr) {
                    setCompare([])
                    return
                }
                setCompare(undefined)
                const fromTree = await getRepoTree(repo, branchFrom.commitAddr)
                const fromTreeItems = [...fromTree.items].filter(
                    (item) => ['blob', 'blobExecutable', 'link'].indexOf(item.type) >= 0,
                )
                console.debug('[Pull create] - From tree blobs:', fromTreeItems)
                const toTree = await getRepoTree(repo, branchTo.commitAddr)
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
                            const from = fromTreeItems.find(
                                (fItem) =>
                                    fItem.path === item.path && fItem.name === item.name,
                            )
                            const to = toTreeItems.find(
                                (tItem) =>
                                    tItem.path === item.path && tItem.name === item.name,
                            )
                            if (from && to) {
                                const fromBlob = await getBlob(
                                    wallet,
                                    repo,
                                    branchFrom,
                                    from,
                                )
                                const toBlob = await getBlob(wallet, repo, branchTo, to)
                                compare.push({
                                    to: { item: to, blob: toBlob },
                                    from: { item: from, blob: fromBlob },
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
                            const fromBlob = await getBlob(wallet, repo, branchFrom, item)
                            compare.push({
                                to: undefined,
                                from: { item, blob: fromBlob },
                                showDiff:
                                    compare.length < 10 || Buffer.isBuffer(fromBlob),
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
            } catch (e: any) {
                console.error(e.message)
                toast.error(e.message)
            }
        }

        setCompare([])
        if (repo && wallet && compareParam !== 'main...main') onCompare(wallet, repo)
    }, [compareParam, repo, wallet])

    const onCommitMerge = async (values: TCommitFormValues) => {
        try {
            if (!userState.keys) throw new GoshError(EGoshError.NO_USER)
            if (!wallet) throw new GoshError(EGoshError.NO_WALLET)
            if (!repoName) throw new GoshError(EGoshError.NO_REPO)
            if (!branchFrom || !branchTo) throw new GoshError(EGoshError.NO_BRANCH)
            if (branchFrom.name === branchTo.name || !compare?.length)
                throw new GoshError(EGoshError.PR_NO_MERGE)

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

            if (branchTo.isProtected) {
                if (smvBalance.smvBusy) throw new GoshError(EGoshError.SMV_LOCKER_BUSY)
                if (smvBalance.smvBalance < 20)
                    throw new GoshError(EGoshError.SMV_NO_BALANCE, { min: 20 })
            }

            const message = [values.title, values.message].filter((v) => !!v).join('\n\n')
            await wallet.createCommit(
                repo,
                branchTo,
                userState.keys.public,
                blobs,
                message,
                values.tags,
                branchFrom,
                progressCallback,
            )

            // Delete branch after merge (if selected), update branches, redirect
            if (values.deleteBranch) await wallet.deleteBranch(repo, branchFrom.name)
            await updateBranches()
            navigate(
                branchTo.isProtected
                    ? `/${daoName}/events`
                    : `/${daoName}/${repoName}/tree/${branchTo.name}`,
                { replace: true },
            )
        } catch (e: any) {
            console.error(e.message)
            toast.error(e.message)
        }
    }

    if (!wallet) return <Navigate to={`/${daoName}/${repoName}`} />
    return (
        <div className="bordered-block px-7 py-8">
            <div className="flex items-center gap-x-4">
                <BranchSelect
                    branch={localBranches?.from}
                    branches={branches}
                    onChange={(selected) =>
                        !!selected &&
                        setlocalBranches((currVal) => ({
                            ...currVal,
                            from: selected,
                        }))
                    }
                />
                <span>
                    <FontAwesomeIcon icon={faChevronRight} size="sm" />
                </span>
                <BranchSelect
                    branch={localBranches?.to}
                    branches={branches}
                    onChange={(selected) =>
                        !!selected &&
                        setlocalBranches((currVal) => ({
                            ...currVal,
                            to: selected,
                        }))
                    }
                />
                <button
                    className="btn btn--body px-3 !py-1.5 !text-sm"
                    disabled={compare === undefined}
                    onClick={() =>
                        navigate(
                            `/${daoName}/${repoName}/pull?compare=${localBranches?.from?.name}...${localBranches?.to?.name}`,
                        )
                    }
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
                            <span className="font-semibold mx-2">{branchFrom?.name}</span>
                            <FontAwesomeIcon icon={faArrowRight} size="sm" />
                            <span className="font-semibold ml-2">{branchTo?.name}</span>
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
                                    title: `Merge branch '${branchFrom?.name}' into '${branchTo?.name}'`,
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
                                                !branchFrom?.isProtected && (
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

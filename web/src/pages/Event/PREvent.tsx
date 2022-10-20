import { useEffect, useState } from 'react'
import Spinner from '../../components/Spinner'
import { getCommitTime, AppConfig, zstd, TGoshDiff } from 'react-gosh'
import BlobDiffPreview from '../../components/Blob/DiffPreview'
import { GoshCommit } from 'react-gosh/dist/gosh/0.11.0/goshcommit'
import { GoshDiff } from 'react-gosh/dist/gosh/0.11.0/goshdiff'
import { AccountType } from '@eversdk/appkit'
import { Buffer } from 'buffer'
import * as Diff from 'diff'
import CopyClipboard from '../../components/CopyClipboard'
import { shortString } from 'react-gosh'
import { IGoshCommit, IGoshRepository } from 'react-gosh/dist/gosh/interfaces'
import { TCommit, TTreeItem } from 'react-gosh/dist/types/repo.types'
import { useOutletContext } from 'react-router-dom'
import { TDaoLayoutOutletContext } from '../DaoLayout'

type TCommitBlobsType = {
    className?: string
    daoName?: string
    repoName: string
    branchName: string
    commitName: string
    status: { completed: boolean; accepted: boolean }
}

const PREvent = (props: TCommitBlobsType) => {
    const { className, daoName, repoName, branchName, commitName, status } = props
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const [isFetched, setIsFetched] = useState<boolean>(false)
    const [blobs, setBlobs] = useState<any[]>([])
    const [details, setDetails] = useState<TCommit>()

    const renderCommitter = (committer: string) => {
        const [pubkey] = committer.split(' ')
        return (
            <CopyClipboard
                label={shortString(pubkey)}
                componentProps={{
                    text: pubkey,
                }}
            />
        )
    }

    /** Get all diffs for commit */
    // const getCommitDiffs = async (commit: IGoshCommit, fileCount: number) => {
    //     const diffs: TGoshDiff[] = []
    //     for (let index1 = 0; index1 < fileCount; index1++) {
    //         let index2 = 0
    //         while (true) {
    //             const address = await commit.getDiffAddr(index1, index2)
    //             const diff = new GoshDiff(AppConfig.goshclient, address)
    //             const acc = await diff.account.getAccount()
    //             if (acc.acc_type !== AccountType.active) break

    //             diffs.push(...(await diff.getDiffs()))
    //             index2++
    //         }
    //     }

    //     return diffs
    // }

    /** Build diff (prev content <-> curr content) for blob */
    // const getDiff = async (
    //     repo: IGoshRepository,
    //     snapaddr: string,
    //     commit: string,
    //     treeitem: TTreeItem,
    //     diffs: TGoshDiff[],
    // ) => {
    //     if (!diffs.length) {
    //         const diff = await

    //         const curr = await getBlobAtCommit(repo, snapaddr, commit, treeitem)

    //         let prev
    //         if (curr.prevcommit) {
    //             prev = await getBlobAtCommit(repo, snapaddr, curr.prevcommit, treeitem)
    //         }

    //         return { curr: curr.content, prev: prev?.content || '' }
    //     } else {
    //         const prev = await getBlobAtCommit(repo, snapaddr, commit, treeitem)
    //         console.debug('Prev snap state', prev)

    //         let curr = prev.content
    //         for (const { ipfs, patch } of diffs) {
    //             if (ipfs) {
    //                 const compressed = (await loadFromIPFS(ipfs)).toString()
    //                 const decompressed = await zstd.decompress(compressed, true)
    //                 curr = decompressed
    //             } else if (patch && !Buffer.isBuffer(curr)) {
    //                 const decompressed = await zstd.decompress(
    //                     Buffer.from(patch, 'hex').toString('base64'),
    //                     true,
    //                 )
    //                 curr = Diff.applyPatch(curr, decompressed)
    //             }
    //         }
    //         console.debug('Curr snap state', curr)
    //         return { curr, prev: prev.content }
    //     }
    // }

    /** Load diff for blob */
    // const onLoadDiff = async (index: number) => {
    //     setBlobs((curr) =>
    //         curr.map((item, i) => {
    //             if (i === index) return { ...item, isFetching: true }
    //             else return item
    //         }),
    //     )
    //     const { repo, snap, commit, treeitem, diffs } = blobs[index]
    //     const { curr, prev } = await getDiff(repo, snap, commit, treeitem, diffs)
    //     setBlobs((state) =>
    //         state.map((item, i) => {
    //             if (i === index)
    //                 return { ...item, curr, prev, isFetching: false, showDiff: true }
    //             else return item
    //         }),
    //     )
    // }

    // useEffect(() => {
    //     const getCommitBlobs = async (
    //         _repoName: string,
    //         _branchName: string,
    //         _commitName: string,
    //     ) => {
    //         if (!daoName || !gosh) return

    //         setIsFetched(false)

    //         const repo = await gosh.getRepository({ name: `${daoName}/${_repoName}` })
    //         const commitAddr = await repo.getCommitAddr(_commitName)
    //         const commit = new GoshCommit(repo.account.client, commitAddr)
    //         const commitDetails = await commit.getDetails()
    //         setDetails(commitDetails)

    //         const parents = await commit.getParents()
    //         const parent = new GoshCommit(repo.account.client, parents[0])
    //         const parentName = await parent.getName()

    //         const tree = await getRepoTree(repo, commitAddr)
    //         const treeParent = await getRepoTree(repo, parents[0])
    //         console.debug('Tree', tree)
    //         console.debug('Tree parent', treeParent)

    //         // Compare trees to determine new/changed blobs
    //         const updatedItems: TGoshTreeItem[] = []
    //         for (const item of tree.items.filter(
    //             (i) => ['blob', 'blobExecutable', 'link'].indexOf(i.type) >= 0,
    //         )) {
    //             const fullpath = `${item.path ? `${item.path}/` : ''}${item.name}`
    //             const found = treeParent.items.findIndex((pitem) => {
    //                 let pfullpath = `${pitem.path ? `${pitem.path}/` : ''}`
    //                 pfullpath = `${pfullpath}${pitem.name}`
    //                 return pitem.sha1 === item.sha1 && pfullpath === fullpath
    //             })
    //             if (found < 0) updatedItems.push(item)
    //         }
    //         console.debug('Updated items', updatedItems)

    //         // Get all diffs for commit
    //         const commitDiffs: TGoshDiff[] = []
    //         try {
    //             const _diffs = await getCommitDiffs(commit, updatedItems.length)
    //             commitDiffs.push(..._diffs)
    //         } catch {}
    //         console.debug('Commit diffs', commitDiffs)

    //         // Iterate updated items and get snapshots states
    //         const updatedBlobs: any[] = await Promise.all(
    //             updatedItems.map(async (item, index) => {
    //                 const fullpath = `${item.path ? `${item.path}/` : ''}${item.name}`
    //                 const snapaddr = await repo.getSnapshotAddr(_branchName, fullpath)
    //                 const diffs = commitDiffs.filter((diff) => diff.sha1 === item.sha1)
    //                 const diffCommit = diffs.length ? parentName : _commitName
    //                 const diff =
    //                     index < 5
    //                         ? await getDiff(repo, snapaddr, diffCommit, item, diffs)
    //                         : { curr: '', prev: '' }

    //                 return {
    //                     repo,
    //                     snap: snapaddr,
    //                     commit: _commitName,
    //                     treeitem: item,
    //                     fullpath,
    //                     diffs,
    //                     ...diff,
    //                     isFetching: false,
    //                     showDiff: index < 5,
    //                 }
    //             }),
    //         )
    //         console.debug('Updated blobs', updatedBlobs)

    //         setBlobs(updatedBlobs)
    //         setIsFetched(true)
    //     }

    //     getCommitBlobs(repoName, branchName, commitName)
    // }, [gosh, daoName, repoName, branchName, commitName])

    return (
        <div className={className}>
            {status.completed && status.accepted && (
                <div className="bg-green-700 text-white mt-6 px-4 py-3 rounded">
                    PR proposal was accepted by SMV
                </div>
            )}

            <h4 className="mt-10 mb-3 text-lg font-semibold">PR details</h4>
            <div>{details?.title}</div>
            <pre className="mb-2 text-gray-050a15/65 text-sm">{details?.message}</pre>
            <div className="flex flex-wrap border-t gap-x-6 py-1 text-gray-050a15/75 text-xs">
                <div>
                    {repoName}:{branchName}
                </div>
                <div className="flex items-center">
                    <span className="mr-2 text-gray-050a15/65">Commit by</span>
                    {renderCommitter(details?.committer || '')}
                </div>
                <div>
                    <span className="mr-2 text-gray-050a15/65">at</span>
                    {getCommitTime(details?.committer || '').toLocaleString()}
                </div>
                <div className="grow flex items-center justify-start sm:justify-end">
                    <span className="mr-2 text-gray-050a15/65">commit</span>
                    <CopyClipboard
                        label={shortString(commitName, 10, 10)}
                        componentProps={{
                            text: commitName,
                        }}
                    />
                </div>
            </div>

            <h4 className="mt-10 mb-3 text-lg font-semibold">PR diff</h4>
            {!isFetched && (
                <div className="text-gray-606060 text-sm">
                    <Spinner className="mr-3" />
                    Loading commit diff...
                </div>
            )}

            {isFetched &&
                blobs.map((blob, index) => (
                    <div key={index} className="my-5 border rounded overflow-hidden">
                        <div className="bg-gray-100 border-b px-3 py-1.5 text-sm font-semibold">
                            {blob.fullpath}
                        </div>
                        {blob.showDiff ? (
                            <BlobDiffPreview modified={blob.curr} original={blob.prev} />
                        ) : (
                            <button
                                className="!block btn btn--body !text-sm mx-auto px-3 py-1.5 my-4"
                                disabled={false}
                                // onClick={() => onLoadDiff(index)}
                            >
                                {blob.isFetching && (
                                    <Spinner className="mr-2" size="sm" />
                                )}
                                Load diff
                            </button>
                        )}
                    </div>
                ))}
        </div>
    )
}

export default PREvent

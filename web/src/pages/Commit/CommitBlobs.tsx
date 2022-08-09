import { useEffect, useState } from 'react'
import Spinner from '../../components/Spinner'
import { getBlobAtCommit, getRepoTree } from 'gosh-react'
import { IGoshRepository, TGoshTreeItem } from 'gosh-react'
import BlobDiffPreview from '../../components/Blob/DiffPreview'
import { GoshCommit } from 'gosh-react'

type TCommitBlobsType = {
    className?: string
    repo: IGoshRepository
    branch: string
    commit: string
}

const CommitBlobs = (props: TCommitBlobsType) => {
    const { className, repo, branch, commit } = props
    const [isFetched, setIsFetched] = useState<boolean>(false)
    const [blobs, setBlobs] = useState<any[]>([])

    const getDiff = async (
        repo: IGoshRepository,
        snapaddr: string,
        commit: string,
        treeitem: TGoshTreeItem,
    ) => {
        const curr = await getBlobAtCommit(repo, snapaddr, commit, treeitem)

        let prev
        if (!curr.deployed) {
            prev = await getBlobAtCommit(repo, snapaddr, curr.prevcommit, treeitem)
        }

        return { curr: curr.content, prev: prev?.content || '' }
    }

    const onLoadDiff = async (index: number) => {
        setBlobs((curr) =>
            curr.map((item, i) => {
                if (i === index) return { ...item, isFetching: true }
                else return item
            }),
        )
        const { snap, commit, treeitem } = blobs[index]
        const { curr, prev } = await getDiff(repo, snap, commit, treeitem)
        setBlobs((state) =>
            state.map((item, i) => {
                if (i === index)
                    return { ...item, curr, prev, isFetching: false, showDiff: true }
                else return item
            }),
        )
    }

    useEffect(() => {
        const getCommitBlobs = async (
            repo: IGoshRepository,
            branch: string,
            commitName: string,
        ) => {
            setIsFetched(false)

            const commitAddr = await repo.getCommitAddr(commitName)
            const commit = new GoshCommit(repo.account.client, commitAddr)
            const parents = await commit.getParents()

            const tree = await getRepoTree(repo, commitAddr)
            const treeParent = await getRepoTree(repo, parents[0])
            console.debug('Tree', tree)
            console.debug('Tree parent', treeParent)

            // Compare trees to determine new/changed blobs
            const updatedItems: TGoshTreeItem[] = []
            for (const item of tree.items.filter(
                (i) => ['blob', 'blobExecutable', 'link'].indexOf(i.type) >= 0,
            )) {
                const fullpath = `${item.path ? `${item.path}/` : ''}${item.name}`
                const found = treeParent.items.findIndex((pitem) => {
                    let pfullpath = `${pitem.path ? `${pitem.path}/` : ''}`
                    pfullpath = `${pfullpath}${pitem.name}`
                    return pitem.sha1 === item.sha1 && pfullpath === fullpath
                })
                if (found < 0) updatedItems.push(item)
            }
            console.debug('Updated items', updatedItems)

            // Iterate updated items and get snapshots states
            const updatedBlobs: any[] = await Promise.all(
                updatedItems.map(async (item, index) => {
                    const fullpath = `${item.path ? `${item.path}/` : ''}${item.name}`
                    const snapaddr = await repo.getSnapshotAddr(branch, fullpath)
                    const diff =
                        index < 5
                            ? await getDiff(repo, snapaddr, commitName, item)
                            : { curr: '', prev: '' }

                    return {
                        snap: snapaddr,
                        commit: commitName,
                        treeitem: item,
                        fullpath,
                        ...diff,
                        isFetching: false,
                        showDiff: index < 5,
                    }
                }),
            )
            console.debug('Updated blobs', updatedBlobs)

            setBlobs(updatedBlobs)
            setIsFetched(true)
        }

        getCommitBlobs(repo, branch, commit)
    }, [repo, branch, commit])

    return (
        <div className={className}>
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
                                onClick={() => onLoadDiff(index)}
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

export default CommitBlobs

import { useEffect, useState } from 'react';
import Spinner from '../../components/Spinner';
import { getRepoTree, loadFromIPFS, zstd } from '../../helpers';
import { IGoshRepository, TGoshTreeItem } from '../../types/types';
import { abiSerialized, TonClient } from '@eversdk/core';
import { Buffer } from 'buffer';
import BlobDiffPreview from '../../components/Blob/DiffPreview';
import { GoshCommit, GoshSnapshot } from '../../types/classes';
import GoshSnapshotAbi from '../../contracts/snapshot.abi.json';
import * as Diff from 'diff';
import { sleep } from '../../utils';

type TCommitBlobsType = {
    className?: string;
    repo: IGoshRepository;
    branch: string;
    commit: string;
};

const CommitBlobs = (props: TCommitBlobsType) => {
    const { className, repo, branch, commit } = props;
    const [isFetched, setIsFetched] = useState<boolean>(false);
    const [blobs, setBlobs] = useState<any[]>([]);

    const reversePatch = (patch: string) => {
        const parsedDiff = Diff.parsePatch(patch)[0];

        const { oldFileName, newFileName, oldHeader, newHeader, hunks } = parsedDiff;

        parsedDiff.oldFileName = newFileName;
        parsedDiff.oldHeader = newHeader;
        parsedDiff.newFileName = oldFileName;
        parsedDiff.newHeader = oldHeader;

        for (const hunk of hunks) {
            const { oldLines, oldStart, newLines, newStart, lines } = hunk;
            hunk.oldLines = newLines;
            hunk.oldStart = newStart;
            hunk.newLines = oldLines;
            hunk.newStart = oldStart;

            hunk.lines = lines.map((l) => {
                if (l.startsWith('-')) return `+${l.slice(1)}`;
                if (l.startsWith('+')) return `-${l.slice(1)}`;
                return l;
            });
        }

        return parsedDiff;
    };

    const getMessages = async (
        addr: string,
        commit: string,
        retry: boolean = true,
        reached: boolean = false,
        approved: boolean = false,
        cursor: string = '',
        msgs: any[] = []
    ): Promise<any> => {
        const queryString = `
        query{
            blockchain{
                account(
                  address:"${addr}"
                ) {
                messages(msg_type:IntIn, last:50, before:"${cursor}") {
                  edges{
                    node{
                      boc
                      created_at
                    }
                    cursor
                  }
                  pageInfo{
                    hasPreviousPage
                    startCursor
                  }
                }
              }
            }
          }`;
        const query = await repo.account.client.net.query({
            query: queryString,
        });
        const messages = query.result.data.blockchain.account.messages;
        messages.edges.sort(
            (a: any, b: any) =>
                //@ts-ignore
                (a.node.created_at < b.node.created_at) -
                //@ts-ignore
                (a.node.created_at > b.node.created_at)
        );
        for (const item of messages.edges) {
            try {
                const decoded = await repo.account.client.abi.decode_message({
                    abi: abiSerialized(GoshSnapshotAbi),
                    message: item.node.boc,
                    allow_partial: true,
                });
                console.debug('Decoded', decoded);

                // Retry reading messages if needed message not found
                if (
                    retry &&
                    ['constructor', 'approve', 'cancelDiff'].indexOf(decoded.name) < 0
                ) {
                    await sleep(5000);
                    return await getMessages(addr, commit);
                } else retry = false;

                // Process message by type
                if (decoded.name === 'constructor') {
                    msgs.push(decoded.value);
                    return { msgs, prevcommit: decoded.value.commit };
                } else if (decoded.name === 'approve') approved = true;
                else if (decoded.name === 'cancelDiff') approved = false;
                else if (decoded.name === 'destroy') return { msgs, prevcommit: commit };
                else if (approved && decoded.name === 'applyDiff') {
                    msgs.push(decoded.value);
                    if (reached)
                        return {
                            msgs,
                            prevcommit: decoded.value.diff.commit,
                        };
                    if (decoded.value.diff.commit === commit) reached = true;
                }
            } catch {}
        }

        if (messages.pageInfo.hasPreviousPage) {
            return await getMessages(
                addr,
                commit,
                retry,
                reached,
                approved,
                messages.pageInfo.startCursor,
                msgs
            );
        }
        return { msgs, prevcommit: commit };
    };

    const getBlobAtCommit = async (
        client: TonClient,
        snapaddr: string,
        commit: string,
        treeitem: TGoshTreeItem
    ) => {
        const snap = new GoshSnapshot(repo.account.client, snapaddr);
        const snapdata = await snap.getSnapshot(commit, treeitem);
        console.debug('Snap data', snapdata);
        if (Buffer.isBuffer(snapdata.content))
            return { content: snapdata.content, deployed: true };

        const { msgs, prevcommit } = await getMessages(snapaddr, commit);
        console.debug('Snap messages', msgs, prevcommit);

        let content = snapdata.content;
        let deployed = false;
        for (const message of msgs) {
            const msgcommit = message.diff ? message.diff.commit : message.commit;
            const msgipfs = message.diff ? message.diff.ipfs : message.ipfsdata;
            const msgpatch = message.diff ? message.diff.patch : null;
            const msgdata = message.diff ? null : message.data;

            if (msgipfs) {
                const compressed = (await loadFromIPFS(msgipfs)).toString();
                const decompressed = await zstd.decompress(client, compressed, true);
                content = decompressed;
                if (message.ipfsdata) deployed = true;
            } else if (msgdata) {
                const compressed = Buffer.from(msgdata, 'hex').toString('base64');
                const decompressed = await zstd.decompress(client, compressed, true);
                content = decompressed;
                deployed = true;
            } else if (msgpatch && msgcommit !== commit) {
                const patch = await zstd.decompress(
                    repo.account.client,
                    Buffer.from(msgpatch, 'hex').toString('base64'),
                    true
                );
                const reversedPatch = reversePatch(patch);
                const reversed = Diff.applyPatch(content, reversedPatch);
                content = reversed;
            }

            if (msgcommit === commit) break;
        }
        console.debug('Result content', content);
        return { content, deployed, prevcommit };
    };

    const getDiff = async (
        client: TonClient,
        snapaddr: string,
        commit: string,
        treeitem: TGoshTreeItem
    ) => {
        const curr = await getBlobAtCommit(client, snapaddr, commit, treeitem);

        let prev;
        if (!curr.deployed) {
            prev = await getBlobAtCommit(client, snapaddr, curr.prevcommit, treeitem);
        }

        return { curr: curr.content, prev: prev?.content || '' };
    };

    const onLoadDiff = async (index: number) => {
        setBlobs((curr) =>
            curr.map((item, i) => {
                if (i === index) return { ...item, isFetching: true };
                else return item;
            })
        );
        const { snap, commit, treeitem } = blobs[index];
        const { curr, prev } = await getDiff(repo.account.client, snap, commit, treeitem);
        setBlobs((state) =>
            state.map((item, i) => {
                if (i === index)
                    return { ...item, curr, prev, isFetching: false, showDiff: true };
                else return item;
            })
        );
    };

    useEffect(() => {
        const getCommitBlobs = async (
            repo: IGoshRepository,
            branch: string,
            commitName: string
        ) => {
            setIsFetched(false);

            const commitAddr = await repo.getCommitAddr(commitName);
            const commit = new GoshCommit(repo.account.client, commitAddr);
            const parents = await commit.getParents();

            const tree = await getRepoTree(repo, commitAddr);
            const treeParent = await getRepoTree(repo, parents[0]);
            console.debug('Tree', tree);
            console.debug('Tree parent', treeParent);

            // Compare trees to determine new/changed blobs
            const updatedItems: TGoshTreeItem[] = [];
            for (const item of tree.items.filter((i) => i.type === 'blob')) {
                const fullpath = `${item.path ? `${item.path}/` : ''}${item.name}`;
                const found = treeParent.items.findIndex((pitem) => {
                    let pfullpath = `${pitem.path ? `${pitem.path}/` : ''}`;
                    pfullpath = `${pfullpath}${pitem.name}`;
                    return pitem.sha1 === item.sha1 && pfullpath === fullpath;
                });
                if (found < 0) updatedItems.push(item);
            }
            console.debug('Updated items', updatedItems);

            // Iterate updated items and get snapshots states
            const updatedBlobs: any[] = await Promise.all(
                updatedItems.map(async (item, index) => {
                    const fullpath = `${item.path ? `${item.path}/` : ''}${item.name}`;
                    const snapaddr = await repo.getSnapshotAddr(branch, fullpath);
                    const diff =
                        index < 5
                            ? await getDiff(
                                  repo.account.client,
                                  snapaddr,
                                  commitName,
                                  item
                              )
                            : { curr: '', prev: '' };

                    return {
                        snap: snapaddr,
                        commit: commitName,
                        treeitem: item,
                        fullpath,
                        ...diff,
                        isFetching: false,
                        showDiff: index < 5,
                    };
                })
            );
            console.debug('Updated blobs', updatedBlobs);

            setBlobs(updatedBlobs);
            setIsFetched(true);
        };

        getCommitBlobs(repo, branch, commit);
    }, [repo, branch, commit]);

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
    );
};

export default CommitBlobs;

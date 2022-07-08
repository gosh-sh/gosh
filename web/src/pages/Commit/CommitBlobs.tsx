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
        approved: boolean = false,
        reached: boolean = false,
        cursor: string = '',
        msgs: any[] = []
    ) => {
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
                if (decoded.name === 'approve') approved = true;
                else if (decoded.name === 'cancelDiff') approved = false;
                else if (decoded.name === 'destroy') return { msgs, reached };
                else if (approved && decoded.name === 'applyDiff') {
                    msgs.push(decoded.value);
                    if (reached) return { msgs, reached };
                    if (decoded.value.namecommit === commit) reached = true;
                }
            } catch {}
        }

        if (messages.pageInfo.hasPreviousPage) {
            await getMessages(
                addr,
                commit,
                approved,
                reached,
                messages.pageInfo.startCursor,
                msgs
            );
        }
        return { msgs, reached };
    };

    const applyMessages = async (
        client: TonClient,
        commit: string,
        messages: any[],
        blob: any
    ) => {
        let _reached = false;
        for (let i = 0; i < messages.length; i++) {
            const item = messages[i];
            if (!_reached && item.namecommit === commit) _reached = true;
            console.debug(_reached);

            if (item.diff.ipfs) {
                const compressed = (await loadFromIPFS(item.diff.ipfs)).toString();
                const decompressed = await zstd.decompress(client, compressed, true);
                console.debug(decompressed);
                if (!_reached) blob.curr = decompressed;
                else blob.prev = decompressed;

                console.debug('ipfs blob', blob);
            } else {
                const prevItem = i > 0 ? messages[i - 1] : null;
                if (prevItem && prevItem.diff.ipfs) {
                    if (prevItem.namecommit === commit) {
                        blob.curr = blob.prev;
                        blob.prev = blob.snapdata.patched;
                        continue;
                    } else blob.curr = blob.snapdata.patched;
                }

                if (prevItem && !prevItem.diff.ipfs) {
                    if (prevItem.namecommit === commit) continue;
                }

                const patch = await zstd.decompress(
                    repo.account.client,
                    Buffer.from(item.diff.patch, 'hex').toString('base64'),
                    true
                );

                const reversedPatch = reversePatch(patch);
                const reversed = Diff.applyPatch(blob.curr, reversedPatch);
                if (!_reached) blob.curr = reversed;
                else blob.prev = reversed;

                console.debug('patch blob', blob);
            }
        }

        return blob;
    };

    const onLoadDiff = async (index: number) => {
        setBlobs((curr) =>
            curr.map((item, i) => {
                if (i === index) return { ...item, isFetching: true };
                else return item;
            })
        );
        let blob = { ...blobs[index] };
        const { msgs } = await getMessages(blob.snapaddr, blob.commit);
        blob = await applyMessages(repo.account.client, blob.commit, msgs, blob);
        setBlobs((curr) =>
            curr.map((item, i) => {
                if (i === index) return { ...blob, isFetching: false, showDiff: true };
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
            for (const item of tree.items) {
                const found = treeParent.items.findIndex(
                    (pitem) => pitem.sha1 === item.sha1
                );
                if (found < 0) updatedItems.push(item);
            }
            console.debug('Updated items', updatedItems);

            // Iterate updated items and get snapshots
            const updatedBlobs: any[] = await Promise.all(
                updatedItems.map(async (item, index) => {
                    const fullpath = `${item.path ? `${item.path}/` : ''}${item.name}`;
                    const snapaddr = await repo.getSnapshotAddr(branch, fullpath);
                    console.debug(snapaddr);
                    const snap = new GoshSnapshot(repo.account.client, snapaddr);
                    const data = await snap.getSnapshot(commitName, item);
                    const messages =
                        index < 5 ? await getMessages(snapaddr, commitName) : [];
                    return {
                        item,
                        snapaddr,
                        commit: commitName,
                        fullpath,
                        snapdata: data,
                        messages,
                        prev: '',
                        curr: data.content,
                        showDiff: index < 5,
                        isFetching: false,
                    };
                })
            );
            console.debug('Updated blobs', updatedBlobs);

            // Apply patches
            await Promise.all(
                updatedBlobs
                    .filter(({ showDiff }) => showDiff)
                    .map(async (blob) => {
                        const { msgs } = blob.messages;
                        blob = await applyMessages(
                            repo.account.client,
                            commitName,
                            msgs,
                            blob
                        );
                    })
            );

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

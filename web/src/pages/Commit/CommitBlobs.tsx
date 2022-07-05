import { useEffect, useState } from 'react';
import Spinner from '../../components/Spinner';
import { getRepoTree, loadFromIPFS, zstd } from '../../helpers';
import { IGoshRepository } from '../../types/types';
import { abiSerialized } from '@eversdk/core';
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
    const [blobs, setBlobs] = useState<
        {
            filename: string;
            prev: string;
            curr: string;
        }[]
    >([]);

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
                if (decoded.name === 'destroy') return msgs;
                if (decoded.name === 'applyDiff') {
                    msgs.push(decoded.value);
                    if (reached) return msgs;
                    if (decoded.value.namecommit === commit) reached = true;
                }
            } catch {}
        }

        if (messages.pageInfo.hasPreviousPage) {
            await getMessages(addr, commit, reached, messages.pageInfo.startCursor, msgs);
        }
        return msgs;
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

            const tree = await getRepoTree(repo, commitAddr);
            console.debug('Tree', tree);

            const messages = await repo.account.client.net.query_collection({
                collection: 'messages',
                filter: {
                    dst: {
                        eq: commitAddr,
                    },
                    msg_type: { eq: 0 },
                },
                result: 'dst boc created_at',
            });
            console.debug(messages.result);

            const blobs: any[] = [];
            for (const message of messages.result) {
                try {
                    const decoded = await repo.account.client.abi.decode_message({
                        abi: abiSerialized(commit.abi),
                        message: message.boc,
                        allow_partial: true,
                    });
                    // console.debug('Decoded', decoded);

                    if (decoded.name === 'getAcceptedDiff') {
                        blobs.push({
                            snap: decoded.value.value0.snap,
                            commit: decoded.value.value0.commit,
                        });
                    }
                } catch {}
            }

            const _blobs: any[] = [];
            for (const item of blobs) {
                const snap = new GoshSnapshot(repo.account.client, item.snap);
                let filename = await snap.getName();
                filename = filename.split('/').slice(1).join('/');

                const treeItem = tree.items.find((item) => {
                    const path = item.path ? `${item.path}/` : '';
                    return `${path}${item.name}` === filename;
                });
                if (!treeItem) {
                    console.error('Tree item not found', filename);
                    continue;
                }

                const data = await snap.getSnapshot(commitName, treeItem);
                console.debug('Snap data', data);
                if (Buffer.isBuffer(data.content)) {
                    _blobs.push({ filename, prev: data.content, curr: data.content });
                    continue;
                }

                const snapMsgs = await getMessages(item.snap, commitName);
                console.debug('Snap msgs', snapMsgs);

                const _blob = { filename, prev: '', curr: data.content };
                let _commitReached = false;
                for (let i = 0; i < snapMsgs.length; i++) {
                    const item = snapMsgs[i];
                    if (!_commitReached && item.namecommit === commitName)
                        _commitReached = true;

                    if (item.diff.ipfs) {
                        const compressed = (
                            await loadFromIPFS(item.diff.ipfs)
                        ).toString();
                        const decompressed = await zstd.decompress(
                            repo.account.client,
                            compressed,
                            true
                        );
                        if (!_commitReached) _blob.curr = decompressed;
                        else _blob.prev = decompressed;

                        console.debug('ipfs blob', { ..._blob });
                    } else {
                        const prevItem = i > 0 ? snapMsgs[i - 1] : null;
                        if (prevItem && prevItem.diff.ipfs) {
                            if (prevItem.namecommit === commitName) {
                                _blob.curr = _blob.prev;
                                _blob.prev = data.patched;
                                continue;
                            } else _blob.curr = data.patched;
                        }

                        if (prevItem && !prevItem.diff.ipfs) {
                            if (prevItem.namecommit === commitName) continue;
                        }

                        const patch = await zstd.decompress(
                            snap.account.client,
                            Buffer.from(item.diff.patch, 'hex').toString('base64'),
                            true
                        );

                        const reversedPatch = reversePatch(patch);
                        const reversed = Diff.applyPatch(_blob.curr, reversedPatch);
                        if (!_commitReached) _blob.curr = reversed;
                        else _blob.prev = reversed;

                        console.debug('patch blob', { ..._blob });
                    }
                }
                console.debug('Blob', _blob);
                _blobs.push(_blob);
            }

            setBlobs(_blobs);
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
                            {blob.filename}
                        </div>
                        <BlobDiffPreview modified={blob.curr} original={blob.prev} />
                    </div>
                ))}
        </div>
    );
};

export default CommitBlobs;

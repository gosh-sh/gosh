import React, { useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { IGoshBlob, IGoshCommit, IGoshRepository } from "../../types/types";
import { TRepoLayoutOutletContext } from "../RepoLayout";
import { useMonaco } from "@monaco-editor/react";
import { getCommitTime, getCodeLanguageFromFilename, getCommitTree } from "../../utils";
import BlobDiffPreview from "../../components/Blob/DiffPreview";
import { GoshBlob, GoshCommit } from "../../types/classes";
import CopyClipboard from "../../components/CopyClipboard";
import { shortString } from "../../utils";

import styles from './Commit.module.scss';
import classnames from "classnames/bind";
import { Flex, FlexContainer } from "../../components";

const cnb = classnames.bind(styles);


const CommitPage = () => {
    const { goshRepo } = useOutletContext<TRepoLayoutOutletContext>();
    const { branchName, commitName } = useParams();
    const monaco = useMonaco();
    const [commit, setCommit] = useState<IGoshCommit>();
    const [blobs, setBlobs] = useState<{ name: string; curr: IGoshBlob; prev?: IGoshBlob; }[]>([]);

    const renderCommitter = (committer: string) => {
        const [pubkey] = committer.split(' ');
        return (
            <CopyClipboard
                label={shortString(pubkey)}
                componentProps={{
                    text: pubkey
                }}
            />
        );
    }

    useEffect(() => {
        const getCommit = async (repo: IGoshRepository, branch: string, name: string) => {
            // Get commit data
            const address = await repo.getCommitAddr(branch, name);
            const commit = new GoshCommit(repo.account.client, address);
            await commit.load();

            // Get commit blobs
            const blobAddrs = await commit.getBlobs();
            const blobTrees: IGoshBlob[] = [];
            const blobs: { name: string; curr: IGoshBlob; prev?: IGoshBlob; }[] = [];
            await Promise.all(
                blobAddrs.map(async (addr) => {
                    // Create blob and load it's data
                    const blob = new GoshBlob(repo.account.client, addr);
                    await blob.load();
                    if (!blob.meta) throw Error('Can not load blob meta');

                    // Extract tree blob from common blobs
                    if (blob.meta.name.indexOf('tree ') >= 0) blobTrees.push(blob);
                    else {
                        // If blob has prevSha, load this prev blob
                        let prevBlob = undefined;
                        if (blob.meta?.prevSha) {
                            const prevBlobAddr = await commit.getBlobAddr(`blob ${blob.meta.prevSha}`);
                            prevBlob = new GoshBlob(repo.account.client, prevBlobAddr);
                            await prevBlob.load();
                        }
                        blobs.push({ name: '', curr: blob, prev: prevBlob });
                    }
                })
            );
            console.debug('Trees blobs', blobTrees);
            console.debug('Common blobs', blobs);

            // Construct commit tree
            const filesList = blobTrees
                .map((blob) => blob.meta?.content || '')
                .reduce((a: string[], content) => [...a, ...content.split('\n')], []);
            console.debug('Files list', filesList);
            const commitTree = getCommitTree(filesList);
            console.debug('Commit tree', commitTree);

            // Update blobs names (path) from tree
            Object.values(commitTree).forEach((items) => {
                items.forEach((item) => {
                    const found = blobs.find((bItem) => (
                        bItem.curr.meta?.name === `${item.type} ${item.sha}`
                    ));
                    if (found) found.name = item.name;
                })
            });
            console.debug('Ready to render blobs', blobs);

            setCommit(commit);
            setBlobs(blobs);
        }

        if (goshRepo && branchName && commitName) getCommit(goshRepo, branchName, commitName);
    }, [goshRepo, branchName, commitName]);

    return (
        <div>
            {(!monaco || !commit) && (<p>Loading commit...</p>)}
            {monaco && commit && (
                <>
                    <div>
                        <FlexContainer
                            direction="row"
                            justify="space-between"
                        >
                            <Flex>
                                <h4>
                                    {commit.meta?.content.title}
                                </h4>
                            </Flex>
                            <Flex>
                                <CopyClipboard
                                    label={shortString(commit.meta?.sha || "")}
                                    componentProps={{
                                        text: commit.meta?.sha || ""
                                    }}
                                />
                            </Flex>
                        </FlexContainer>
                        {commit.meta?.content.message && (
                            <pre className="mb-3 text-gray-050a15/65 text-sm">
                                {commit.meta.content.message}
                            </pre>
                        )}
                                    
                        <div className={cnb("commit-meta")}>
                            <div className="flex items-center">
                                            <span className="color-faded">Commit by</span>
                                {renderCommitter(commit.meta?.content.committer || '')}
                            </div>
                            <div>
                                            <span className="color-faded">at</span>
                                {getCommitTime(commit.meta?.content.committer || '').toLocaleString()}
                            </div>
                        </div>
                    </div>

                    {blobs?.map((item, index) => {
                        const language = getCodeLanguageFromFilename(monaco, item.name);
                        return (
                            <div key={index} className="my-5 border rounded overflow-hidden">
                                <div className="bg-gray-100 border-b px-3 py-1.5 text-sm font-semibold">
                                    {item.name}
                                </div>
                                <BlobDiffPreview
                                    original={item.prev?.meta?.content}
                                    modified={item.curr.meta?.content}
                                    modifiedLanguage={language}
                                />
                            </div>
                        );
                    })}
                </>
            )}
        </div>
    );
}

export default CommitPage;

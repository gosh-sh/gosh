import React, { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useRecoilValue } from "recoil";
import BranchSelect from "../../components/BranchSelect";
import CopyClipboard from "../../components/CopyClipboard";
import { Flex, FlexContainer, Loader} from "../../components";
import { getCommitTime } from "../../utils";
import { goshBranchesAtom, goshCurrBranchSelector } from "../../store/gosh.state";
import { GoshCommit } from "../../types/classes";
import { TGoshBranch, IGoshCommit, IGoshRepository } from "../../types/types";
import { shortString } from "../../utils";
import { TRepoLayoutOutletContext } from "../RepoLayout";

import { PuzzleIcon } from '@heroicons/react/outline';

import { Typography } from "@mui/material";

import styles from './Commits.module.scss';
import classnames from "classnames/bind";

const cnb = classnames.bind(styles);


const CommitsPage = () => {
    const { goshRepo } = useOutletContext<TRepoLayoutOutletContext>();
    const { daoName, repoName, branchName = 'main' } = useParams();
    const branches = useRecoilValue(goshBranchesAtom);
    const branch = useRecoilValue(goshCurrBranchSelector(branchName));
    const navigate = useNavigate();
    const [commits, setCommits] = useState<IGoshCommit[]>();

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
        const getCommits = async (repo: IGoshRepository, branch: TGoshBranch) => {
            setCommits(undefined);
            const commits: IGoshCommit[] = [];
            let commitAddr = branch.commitAddr;
            while (commitAddr) {
                const commit = new GoshCommit(repo.account.client, commitAddr);
                await commit.load();
                commitAddr = commit.meta?.parent1Addr || '';
                commits.push(commit);
            }
            setCommits(commits);
        }

        if (goshRepo && branch) getCommits(goshRepo, branch);
    }, [goshRepo, branch]);

    return (<>
        <div className={cnb("repository-actions")}>
            <BranchSelect
                branch={branch}
                branches={branches}
                onChange={(selected) => {
                    if (selected) {
                        navigate(`/organizations/${daoName}/repositories/${repoName}/commits/${selected.name}`);
                    }
                }}
            />
        </div>
        <div className={cnb("tree")}>

                {commits === undefined && (            
                    <div className="loader">
                        <Loader />
                        Loading {"commits"}...
                    </div>
                )}

                {commits && !commits?.length && (
                    <div className="no-data"><PuzzleIcon/>There are no commits yet</div>
                )}

                {Boolean(commits?.length) && 
                    <div className={cnb("commits")}>
                        {commits?.map((commit, index) => 
                            <FlexContainer
                                key={index}
                                className={cnb("commit")}
                                justify="space-between"
                                direction="row"
                                align="flex-start"
                            >
                                <Flex>
                                    <Link
                                        className={cnb("commit-title")}
                                        to={`/organizations/${daoName}/repositories/${repoName}/commit/${branchName}/${commit.meta?.sha}`}
                                    >
                                        {commit.meta?.content.title}
                                    </Link>
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
                                </Flex>

                                <Flex className={cnb("commit-meta-right")}>
                                    <Link
                                        className="px-2 py-1 font-medium font-mono text-xs hover:underline hover:text-gray-0a1124"
                                        to={`/organizations/${daoName}/repositories/${repoName}/commit/${branchName}/${commit.meta?.sha}`}
                                    >
                                        {shortString(commit.meta?.sha || '', 7, 0, '')}
                                    </Link>
                                    <CopyClipboard
                                        componentProps={{
                                            text: commit.meta?.sha || ''
                                        }}
                                    />
                                </Flex>
                            </FlexContainer>
                        )}
                </div>}
            </div>
        </>
    );
}

export default CommitsPage;

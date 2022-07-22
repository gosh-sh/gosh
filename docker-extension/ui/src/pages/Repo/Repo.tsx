import React, { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams, Outlet } from "react-router-dom";
import { IGoshRepository, IGoshSnapshot, TGoshBranch } from "./../../types/types";
import { TRepoLayoutOutletContext } from "./../RepoLayout";
import BranchSelect from "./../../components/BranchSelect";
import { GoshSnapshot } from "./../../types/classes";
import { useRecoilValue } from "recoil";
import { goshCurrBranchSelector } from "./../../store/gosh.state";
import { useGoshRepoBranches } from "./../../hooks/gosh.hooks";
import { Icon, Loader, FlexContainer, Flex } from '../../components';

import { Popover } from '@headlessui/react'
import { ClockIcon, PlusIcon, BookOpenIcon, DownloadIcon } from '@heroicons/react/outline';

import CopyClipboard from "../../components/CopyClipboard";

import styles from './Repo.module.scss';
import classnames from "classnames/bind";
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from "@mui/material/Typography";

const cnb = classnames.bind(styles);

const RepoPage = () => {
    const { goshRepo, goshWallet } = useOutletContext<TRepoLayoutOutletContext>();
    const { daoName, repoName, branchName = 'main' } = useParams();
    const navigate = useNavigate();
    const { branches } = useGoshRepoBranches(goshRepo);
    const branch = useRecoilValue(goshCurrBranchSelector(branchName));
    const [tree, setTree] = useState<IGoshSnapshot[]>();

    useEffect(() => {
        const getTree = async (repo: IGoshRepository, currBranch: TGoshBranch) => {
            setTree(undefined);
            const snapshots = await Promise.all(
                currBranch.snapshot.map(async (address) => {
                    const snapshot = new GoshSnapshot(repo.account.client, address);
                    await snapshot.load();
                    return snapshot;
                })
            );
            console.debug('GoshSnapshots:', snapshots);
            setTree(snapshots);
        }

        if (goshRepo && branch) getTree(goshRepo, branch);
    }, [goshRepo, branch]);

    return (
        <>
            <div className="actions">
                
                <FlexContainer
                    direction="row"
                    justify="flex-start"
                    align="center"
                    className={cnb("repository-actions")}
                >
                    <Flex>
                    
                        <BranchSelect
                            branch={branch}
                            branches={branches}
                            onChange={(selected) => {
                                if (selected) {
                                    navigate(`/organizations/${daoName}/repositories/${repoName}/tree/${selected.name}`);
                                }
                            }}
                        />
                    </Flex>
                    <Flex>
                    <Link
                        to={`/organizations/${daoName}/repositories/${repoName}/branches`}
                        className={cnb("repository-action")}
                    >
                        
                        <span>
                            <Icon icon={"branches"} className={cnb("my-icon")} /> {branches.length}
                        </span>
                        <Typography>{branches.length === 1 ? "branch" : "branches"}</Typography>
                    </Link>
                    </Flex>
                    <Flex>
                    <Link
                        to={`/organizations/${daoName}/repositories/${repoName}/commits/${branchName}`}
                        className={cnb("repository-action")}
                    >

                        <span>
                            <ClockIcon/>
                        </span> <Typography>History</Typography>
                    </Link>
                
                    </Flex>
                    <Flex
                        grow={1000}
                    >
                <div className={cnb("button-actions", "align-right")}>
                    <Link
                        to={`/organizations/${daoName}/repositories/${repoName}/blobs/create/${branchName}`}
                        className="btn btn--body px-4 py-1.5 text-sm !font-normal"
                    >
                        
                        <Button
                            color="inherit"
                            size="medium"
                            variant="contained"
                            className={cnb("button-default", "btn-icon")}
                            disableElevation
                            // icon={<Icon icon={"arrow-up-right"}/>}
                            // iconAnimation="right"
                            // iconPosition="after"
                        ><PlusIcon/> Add file </Button>
                        </Link>

                        <Popover className={cnb("relative")}>
                    <Popover.Button as={"div"}>
                        <Button
                            color="primary"
                            size="medium"
                            variant="contained"
                            className={"btn-icon"}
                            disableElevation
                            // icon={<Icon icon={"arrow-up-right"}/>}
                            // iconAnimation="right"
                            // iconPosition="after"
                        ><DownloadIcon/> Clone </Button></Popover.Button>

                        <Popover.Panel className={cnb("absolute")}>
                            <Paper
                                square={false}
                                className={cnb("gosh-clone-paper")}
                                elevation={14}
                            >
                                <div className={cnb("clone-field")}>
                                    <textarea
                                        onClick={(event: React.MouseEvent<HTMLTextAreaElement, MouseEvent>) => (event.target as HTMLTextAreaElement).select()}
                                        value={`git clone -v gosh::net.ton.dev://${process.env.REACT_APP_GOSH_ADDR}/${daoName}/${repoName}`}
                                        onChange={() => {}}        
                                    />   

                                <CopyClipboard
                                    componentProps={{
                                        text: `git clone -v gosh::net.ton.dev://${process.env.REACT_APP_GOSH_ADDR}/${daoName}/${repoName}`
                                    }}
                                />
                                </div>
                        </Paper>
                        </Popover.Panel>
                        </Popover>
    
                </div>
                
                    </Flex>
                </FlexContainer>





            </div>

            <div className={cnb("tree")}>
                {tree === undefined && (
                    <div className="loader">
                    <Loader />
                    Loading {"tree"}...
                    </div>
                )}

                {tree && !tree?.length && (
                    <div className="no-data"><BookOpenIcon/>There are no files yet</div>
                )}

                    <Outlet context={{ goshRepo, goshWallet }} />
                {Boolean(tree?.length) && <div className={cnb("tree-files")}>
                    {tree?.map((blob, index) => (
                        <div
                            key={index}
                            className={cnb("tree-files-item")}
                        >
                            <div className="basis-1/4 text-sm font-medium">
                                <Link
                                    className="hover:underline"
                                    to={`/organizations/${daoName}/repositories/${repoName}/blob/${blob.meta?.name}`}
                                >
                                    {blob.meta && blob.meta.name.split('/').slice(-1)}
                                </Link>
                            </div>
                            <div className="text-gray-500 text-sm">
                                {/* <Link
                                    className="hover:underline"
                                    to={`/repositories/${repoName}/commit/${blob.lastCommitSha}`}
                                >
                                    {blob.lastCommitMsg.title}
                                </Link> */}
                            </div>
                        </div>
                    ))}
                </div>}
            </div>
        </>
    );
}

export default RepoPage;

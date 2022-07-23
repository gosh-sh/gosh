import React from "react";
import { Link, useNavigate, useOutletContext, useParams, Outlet } from "react-router-dom";
import { TRepoLayoutOutletContext } from "../RepoLayout";
import BranchSelect from "../../components/BranchSelect";
import { useRecoilValue } from "recoil";
import { goshCurrBranchSelector } from "../../store/gosh.state";
import { useGoshRepoBranches } from "../../hooks/gosh.hooks";
import { Icon, Loader, FlexContainer, Flex } from '../../components';
import { splitByPath } from "../../utils";

import { Popover } from '@headlessui/react'
import { ClockIcon, PlusIcon, BookOpenIcon, DownloadIcon, DocumentIcon } from '@heroicons/react/outline';
import { FolderIcon } from '@heroicons/react/solid';

import CopyClipboard from "../../components/CopyClipboard";

import styles from './Repo.module.scss';
import classnames from "classnames/bind";
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from "@mui/material/Typography";

const cnb = classnames.bind(styles);

const RepoPage = () => {
    const { goshRepo, goshRepoTree, goshWallet } = useOutletContext<TRepoLayoutOutletContext>();
    const { daoName, repoName, branchName = 'main' } = useParams();
    const pathName = useParams()['*'] || '';

    const navigate = useNavigate();
    const { branches } = useGoshRepoBranches(goshRepo);
    const branch = useRecoilValue(goshCurrBranchSelector(branchName));
    const subtree = useRecoilValue(goshRepoTree.getSubtree(pathName));

    const [dirUp] = splitByPath(pathName);

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
                    
                    {subtree === undefined ?
                        <Button
                            color="inherit"
                            size="medium"
                            variant="contained"
                            className={cnb("button-default", "btn-icon")}
                            disableElevation
                            disabled={true}

                        ><PlusIcon/> Add file </Button>
                    : <Link
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
                        </Link>}

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
                                        value={`git clone -v gosh::network.gosh.sh://${process.env.REACT_APP_GOSH_ADDR}/${daoName}/${repoName}`}
                                        onChange={() => {}}        
                                    />   

                                <CopyClipboard
                                    componentProps={{
                                        text: `git clone -v gosh::network.gosh.sh://${process.env.REACT_APP_GOSH_ADDR}/${daoName}/${repoName}`
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
                {subtree === undefined && (
                    <div className="loader">
                    <Loader />
                    Loading {"tree"}...
                    </div>
                )}

                {subtree && !subtree?.length && (
                    <div className="no-data"><BookOpenIcon/>There are no files yet</div>
                )}
                <Outlet context={{ goshRepo, goshWallet }} />

                {(!!subtree && pathName || Boolean(subtree?.length)) && <div className={cnb("tree-files")}>
                    {!!subtree && pathName && (
                        <div className={cnb("tree-files-item", "tree-files-item-back")}>
                        <Link
                            to={`/organizations/${daoName}/repositories/${repoName}/tree/${branchName}${dirUp && `/${dirUp}`}`}
                        >
                            ..
                        </Link>
                        </div>
                    )}
                    {Boolean(subtree?.length) && <>
                        {!!subtree && subtree?.map((item: any, index: number) => {
                            const path = [item.path, item.name].filter((part) => part !== '').join('/');
                            const type = item.type === 'tree' ? 'tree' : 'blobs';
                            return (
                                <div
                                    key={index}
                                    className={cnb("tree-files-item", "tree-files-item-" + type)}
                                >
                                        {type === "tree" ? <FolderIcon/> : <DocumentIcon/>}
                                        <Link
                                            className="hover:underline"
                                            to={`/organizations/${daoName}/repositories/${repoName}/${type}/${branchName}/${path}`}
    
                                            // to={`/organizations/${daoName}/repositories/${repoName}/blob/${blob.meta?.name}`}
                                        >
                                            {item.name}
                                        </Link>
                                </div>
                        )})}
                    </>}
            
                    
                </div>}



            </div>
        </>
    );
}

export default RepoPage;

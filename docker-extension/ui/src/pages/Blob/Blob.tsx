import React, { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import BranchSelect from "../../components/BranchSelect";
import { IGoshBlob, IGoshRepository, TGoshTreeItem } from "../../types/types";
import { TRepoLayoutOutletContext } from "../RepoLayout";
import { useMonaco } from "@monaco-editor/react";
import { getCodeLanguageFromFilename, getBlobContent } from "../../utils";

import BlobPreview from "../../components/Blob/Preview";
import CopyClipboard from "../../components/CopyClipboard";

import { Flex, FlexContainer, Loader } from "../../components";
import { useRecoilValue } from "recoil";
import { goshBranchesAtom, goshCurrBranchSelector } from "../../store/gosh.state";
import { AccountType } from "@eversdk/appkit";
import { GoshBlob } from "../../types/classes";

import styles from './Blob.module.scss';
import classnames from "classnames/bind";
import { Typography } from "@mui/material";

const cnb = classnames.bind(styles);

const BlobPage = () => {
    // const { goshRepo } = useOutletContext<TRepoLayoutOutletContext>();
    // const { daoName, repoName, branchName = 'main', blobName } = useParams();
    // const branches = useRecoilValue(goshBranchesAtom);
    // const branch = useRecoilValue(goshCurrBranchSelector(branchName));
    const pathName = useParams()['*'];
    const { daoName, repoName, branchName = 'main' } = useParams();
    const { goshRepo, goshRepoTree } = useOutletContext<TRepoLayoutOutletContext>();



    const navigate = useNavigate();
    const monaco = useMonaco();
    const branches = useRecoilValue(goshBranchesAtom);
    const branch = useRecoilValue(goshCurrBranchSelector(branchName));
    const treeItem = useRecoilValue(goshRepoTree.getTreeItem(pathName));
    const [blob, setBlob] = useState<IGoshBlob>();


    useEffect(() => {
        const getBlob = async (repo: IGoshRepository, treeItem: TGoshTreeItem) => {
            setBlob(undefined);
            const blobAddr = await repo.getBlobAddr(`blob ${treeItem.sha}`);
            const blob = new GoshBlob(repo.account.client, blobAddr);
            const { acc_type } = await blob.account.getAccount();
            if (acc_type === AccountType.active) {
                await blob.load();
                const content = await getBlobContent(repo, treeItem.sha);
                if (blob.meta) blob.meta.content = content;
            };
            setBlob(blob);
        }

        if (goshRepo && treeItem) getBlob(goshRepo, treeItem);
    }, [goshRepo, treeItem]);

    return (<>
    
        <div className="bordered-block px-7 py-8">

            {!blob && (
                <div className="loader">
                    <Loader/>
                    Loading file...
                </div>
            )}
            
            {goshRepoTree.tree && !treeItem && (<Typography className="text-gray-606060 text-sm">File not found</Typography>)}

            {monaco && treeItem && blob?.meta && (
                <div className={cnb("text-editor-wrapper", "text-editor-wrapper-preview")}>
                    <div className={cnb("copy-button")}>
                        <CopyClipboard
                            componentProps={{
                                text: blob.meta.content
                            }}
                            iconContainerClassName="text-extblack/60 hover:text-extblack p-1"

                        />
                        {/* <Link
                            to={`/repositories/${daoName}/organizations/${repoName}/blobs/update/${branchName}/${pathName}`}
                            className="text-extblack/60 hover:text-extblack p-1 ml-2">
                                Update
                        </Link> */}
                    </div>

                    <BlobPreview
                    className={cnb("text-editor")}
                        language={getCodeLanguageFromFilename(monaco, blob.meta.name)}
                        value={blob.meta.content}
                    />
                </div>
            )}
        </div></>
    );
}

export default BlobPage;

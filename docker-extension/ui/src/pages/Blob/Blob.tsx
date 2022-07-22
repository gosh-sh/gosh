import React, { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import BranchSelect from "../../components/BranchSelect";
import { IGoshRepository, IGoshSnapshot } from "../../types/types";
import { TRepoLayoutOutletContext } from "../RepoLayout";
import { useMonaco } from "@monaco-editor/react";
import { getCodeLanguageFromFilename } from "../../utils";
import BlobPreview from "../../components/Blob/Preview";
import CopyClipboard from "../../components/CopyClipboard";
import { GoshSnapshot } from "../../types/classes";
import { Loader} from "../../components";
import { useRecoilValue } from "recoil";
import { goshBranchesAtom, goshCurrBranchSelector } from "../../store/gosh.state";
import { AccountType } from "@eversdk/appkit";


const BlobPage = () => {
    const { goshRepo } = useOutletContext<TRepoLayoutOutletContext>();
    const { daoName, repoName, branchName = 'main', blobName } = useParams();
    const branches = useRecoilValue(goshBranchesAtom);
    const branch = useRecoilValue(goshCurrBranchSelector(branchName));
    const navigate = useNavigate();
    const monaco = useMonaco();
    const [snapshot, setSnapshot] = useState<IGoshSnapshot>();

    useEffect(() => {
        const getSnapshot = async (repo: IGoshRepository, branch: string, blob: string) => {
            setSnapshot(undefined);
            const snapAddr = await repo.getSnapshotAddr(branch, blob);
            const snapshot = new GoshSnapshot(repo.account.client, snapAddr);
            const { acc_type } = await snapshot.account.getAccount();
            if (acc_type === AccountType.active) await snapshot.load();
            setSnapshot(snapshot);
        }

        if (goshRepo && branchName && blobName) getSnapshot(goshRepo, branchName, blobName);
    }, [goshRepo, branchName, blobName]);

    return (
        <div className="bordered-block px-7 py-8">
            <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                    <BranchSelect
                        branch={branch}
                        branches={branches}
                        onChange={(selected) => {
                            if (selected) {
                                navigate(`/${daoName}/${repoName}/blob/${selected.name}/${blobName}`);
                            }
                        }}
                    />
                    <Link
                        to={`/${daoName}/${repoName}/tree/${branchName}`}
                        className="ml-3 text-extblue font-medium hover:underline"
                    >
                        {repoName}
                    </Link>
                    <span className="mx-2">/</span>
                    <span className="font-meduim">{blobName}</span>
                </div>
            </div>

            {!snapshot && (
                <div className="text-gray-606060 text-sm">
                    <Loader/>
                    Loading file...
                </div>
            )}
            {snapshot && !snapshot.meta && (<div className="text-gray-606060 text-sm">File not found</div>)}
            {monaco && snapshot?.meta && (
                <div className="border rounded overflow-hidden">
                    <div className="flex bg-gray-100 px-3 py-1 border-b justify-end">
                        <CopyClipboard
                            componentProps={{
                                text: snapshot.meta.content
                            }}
                            iconContainerClassName="text-extblack/60 hover:text-extblack p-1"

                        />
                        <Link
                            to={`/${daoName}/${repoName}/blobs/update/${branchName}/${blobName}`}
                            className="text-extblack/60 hover:text-extblack p-1 ml-2">
                        </Link>
                    </div>
                    <BlobPreview
                        language={getCodeLanguageFromFilename(monaco, snapshot.meta.name)}
                        value={snapshot.meta.content}
                    />
                </div>
            )}
        </div>
    );
}

export default BlobPage;

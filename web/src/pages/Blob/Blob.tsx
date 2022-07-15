import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import BranchSelect from '../../components/BranchSelect';
import { IGoshRepository, TGoshTreeItem } from '../../types/types';
import { TRepoLayoutOutletContext } from '../RepoLayout';
import { useMonaco } from '@monaco-editor/react';
import { getCodeLanguageFromFilename, isMainBranch, ZERO_COMMIT } from '../../helpers';
import BlobPreview from '../../components/Blob/Preview';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faMagnifyingGlass,
    faPencil,
    faFloppyDisk,
} from '@fortawesome/free-solid-svg-icons';
import CopyClipboard from '../../components/CopyClipboard';
import Spinner from '../../components/Spinner';
import { useRecoilValue } from 'recoil';
import { goshBranchesAtom, goshCurrBranchSelector } from '../../store/gosh.state';
import RepoBreadcrumbs from '../../components/Repo/Breadcrumbs';
import { GoshCommit, GoshSnapshot } from '../../types/classes';
import { useGoshRepoTree } from '../../hooks/gosh.hooks';
import { Buffer } from 'buffer';
import FileDownload from '../../components/FileDownload';

const BlobPage = () => {
    const pathName = useParams()['*'];
    const { daoName, repoName, branchName = 'main' } = useParams();
    const navigate = useNavigate();
    const { goshWallet, goshRepo } = useOutletContext<TRepoLayoutOutletContext>();
    const monaco = useMonaco();
    const branches = useRecoilValue(goshBranchesAtom);
    const branch = useRecoilValue(goshCurrBranchSelector(branchName));
    const { tree, getTreeItem } = useGoshRepoTree(goshRepo, branch, pathName);
    const treeItem = useRecoilValue(getTreeItem(pathName));
    const [blob, setBlob] = useState<any>();

    useEffect(() => {
        const getBlob = async (
            repo: IGoshRepository,
            commitAddr: string,
            branchName: string,
            treeItem: TGoshTreeItem
        ) => {
            setBlob(undefined);

            const commit = new GoshCommit(repo.account.client, commitAddr);
            const commitName = await commit.getName();
            if (commitName === ZERO_COMMIT) return;

            let filepath = `${treeItem.path ? `${treeItem.path}/` : ''}`;
            filepath = `${filepath}${treeItem.name}`;

            const snapAddr = await repo.getSnapshotAddr(branchName, filepath);
            console.debug('Snap addr', snapAddr);
            const snap = new GoshSnapshot(repo.account.client, snapAddr);
            const data = await snap.getSnapshot(commitName, treeItem);
            setBlob({ content: data.content });
        };

        console.debug('Branch commit', branch?.commitAddr);
        if (goshRepo && branch?.commitAddr && treeItem) {
            getBlob(goshRepo, branch?.commitAddr, branch.name, treeItem);
        }
    }, [goshRepo, branch?.commitAddr, branch?.name, treeItem]);

    return (
        <div className="bordered-block px-7 py-8">
            <div className="flex flex-wrap items-center gap-3 mb-5">
                <BranchSelect
                    branch={branch}
                    branches={branches}
                    onChange={(selected) => {
                        if (selected) {
                            navigate(
                                `/${daoName}/${repoName}/blobs/${selected.name}/${pathName}`
                            );
                        }
                    }}
                />
                <div>
                    <RepoBreadcrumbs
                        daoName={daoName}
                        repoName={repoName}
                        branchName={branchName}
                        pathName={pathName}
                    />
                </div>
                <div className="grow text-right">
                    <Link
                        to={`/${daoName}/${repoName}/find/${branchName}`}
                        className="btn btn--body px-4 py-1.5 text-sm !font-normal"
                    >
                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                        <span className="hidden sm:inline-block ml-2">Go to file</span>
                    </Link>
                </div>
            </div>

            {tree?.tree && !treeItem && (
                <div className="text-gray-606060 text-sm">File not found</div>
            )}
            {(!tree?.tree || (treeItem && !blob)) && (
                <div className="text-gray-606060 text-sm">
                    <Spinner className="mr-3" />
                    Loading file...
                </div>
            )}
            {monaco && treeItem && blob?.content && (
                <div className="border rounded overflow-hidden">
                    <div className="flex bg-gray-100 px-3 py-1 border-b justify-end">
                        {!Buffer.isBuffer(blob.content) ? (
                            <>
                                <CopyClipboard
                                    componentProps={{
                                        text: blob.content,
                                    }}
                                    iconContainerClassName="text-extblack/60 hover:text-extblack p-1"
                                    iconProps={{
                                        size: 'sm',
                                    }}
                                />
                                {!isMainBranch(branchName) &&
                                    goshWallet?.isDaoParticipant && (
                                        <Link
                                            to={`/${daoName}/${repoName}/blobs/update/${branchName}/${pathName}`}
                                            className="text-extblack/60 hover:text-extblack p-1 ml-2"
                                        >
                                            <FontAwesomeIcon icon={faPencil} size="sm" />
                                        </Link>
                                    )}
                            </>
                        ) : (
                            <FileDownload
                                name={pathName}
                                content={blob.content}
                                label={<FontAwesomeIcon icon={faFloppyDisk} />}
                            />
                        )}
                    </div>
                    <BlobPreview
                        language={getCodeLanguageFromFilename(monaco, treeItem.name)}
                        value={blob.content}
                    />
                </div>
            )}
        </div>
    );
};

export default BlobPage;

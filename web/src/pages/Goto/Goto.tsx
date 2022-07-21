import React, { useState } from 'react';
import { faFile } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { TRepoLayoutOutletContext } from '../RepoLayout';
import { useGoshRepoTree } from 'web-common/lib/hooks/gosh.hooks';
import { goshCurrBranchSelector } from 'web-common/lib/store/gosh.state';
import Spinner from '../../components/Spinner';
import { TGoshBranch, TGoshTreeItem } from 'web-common/lib/types/types';

const GotoPage = () => {
    const { daoName, repoName, branchName = 'main' } = useParams();
    const { goshRepo } = useOutletContext<TRepoLayoutOutletContext>();
    const branch = useRecoilValue<TGoshBranch | undefined>(
        goshCurrBranchSelector(branchName)
    );
    const { tree, getTreeItems } = useGoshRepoTree(goshRepo, branch);
    const [search, setSearch] = useState<string>('');
    const treeItems = useRecoilValue<TGoshTreeItem[] | undefined>(getTreeItems(search));

    return (
        <div className="bordered-block px-7 py-8">
            <div className="flex items-center mb-3">
                <Link
                    to={`/${daoName}/${repoName}/tree/${branchName}`}
                    className="text-extblue font-medium hover:underline"
                >
                    {repoName}
                </Link>
                <span className="mx-2">/</span>
                <div className="input grow">
                    <input
                        type="text"
                        className="element !py-1.5 !text-sm"
                        placeholder="Search file..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {!tree && (
                <div className="mt-5 text-gray-606060 text-sm">
                    <Spinner className="mr-3" />
                    Loading tree items...
                </div>
            )}
            {!!treeItems &&
                treeItems?.map((item, index) => {
                    const path = `${item.path ? `${item.path}/` : ''}${item.name}`;
                    return (
                        <div
                            key={index}
                            className="flex gap-x-4 py-3 border-b border-gray-300 last:border-b-0"
                        >
                            <Link
                                className="text-sm font-medium hover:underline"
                                to={`/${daoName}/${repoName}/blobs/${branchName}/${path}`}
                            >
                                <FontAwesomeIcon
                                    className="mr-2"
                                    icon={faFile}
                                    fixedWidth
                                />
                                {path}
                            </Link>
                        </div>
                    );
                })}
        </div>
    );
};

export default GotoPage;

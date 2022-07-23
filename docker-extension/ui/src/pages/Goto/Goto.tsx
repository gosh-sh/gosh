import React, { useState } from "react";

import { Link, useOutletContext, useParams } from "react-router-dom";
import { useRecoilValue } from "recoil";
import { TRepoLayoutOutletContext } from "../RepoLayout";


const GotoPage = () => {
    const { daoName, repoName, branchName = 'main' } = useParams();
    const { goshRepoTree } = useOutletContext<TRepoLayoutOutletContext>();
    const [search, setSearch] = useState<string>('');
    const treeItems = useRecoilValue(goshRepoTree.getTreeItems(search));

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

            {!!treeItems && treeItems?.map((item, index) => {
                const path = `${item.path && `${item.path}/`}${item.name}`
                return (
                    <div
                        key={index}
                        className="flex gap-x-4 py-3 border-b border-gray-300 last:border-b-0"
                    >
                        <Link
                            className="text-sm font-medium hover:underline"
                            to={`/${daoName}/${repoName}/blobs/${branchName}/${path}`}
                        >

                            {path}
                        </Link>
                    </div>
                )
            })}
        </div>
    );
}

export default GotoPage;

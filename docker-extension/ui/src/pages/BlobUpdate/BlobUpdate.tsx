import React, { useEffect, useState } from "react";
import { Field, Form, Formik } from "formik";
import { Navigate, Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import * as Yup from "yup";
import { Tab } from "@headlessui/react";
import { classNames } from "../../utils";
import BlobEditor from "../../components/Blob/Editor";
import FormCommitBlock from "../BlobCreate/FormCommitBlock";
import { useMonaco } from "@monaco-editor/react";
import { TRepoLayoutOutletContext } from "../RepoLayout";
import { IGoshRepository, TGoshTreeItem } from "../../types/types";
import { getCodeLanguageFromFilename, getBlobContent, splitByPath, isMainBranch } from "../../utils";

import BlobDiffPreview from "../../components/Blob/DiffPreview";
import { goshCurrBranchSelector } from "../../store/gosh.state";
import { useRecoilValue } from "recoil";
import { useGoshRepoBranches } from "../../hooks/gosh.hooks";
import { userStateAtom } from "../../store/user.state";


type TFormValues = {
    name: string;
    content: string;
    title: string;
    message: string;
}

const BlobUpdatePage = () => {
    const pathName = useParams()['*'];
    const { daoName, repoName, branchName = 'main' } = useParams();
    const { goshRepo, goshRepoTree, goshWallet } = useOutletContext<TRepoLayoutOutletContext>();
    const userState = useRecoilValue(userStateAtom);
    const { updateBranch } = useGoshRepoBranches(goshRepo);
    const branch = useRecoilValue(goshCurrBranchSelector(branchName));
    const navigate = useNavigate();
    const monaco = useMonaco();
    const [activeTab, setActiveTab] = useState<number>(0);
    const treeItem = useRecoilValue(goshRepoTree.getTreeItem(pathName));
    const [blobContent, setBlobContent] = useState<string>();

    const [blobCodeLanguage, setBlobCodeLanguage] = useState<string>('plaintext');
    const urlBack = `/organizations/${daoName}/repositories/${repoName}/blobs/${branchName}${pathName && `/${pathName}`}`;


    const onCommitChanges = async (values: TFormValues) => {
        try {
            if (!userState.keys) throw Error('User is undefined');
            if (!goshWallet) throw Error('GoshWallet is undefined');
            if (!repoName) throw Error('Repository is undefined');
            if (!branch) throw Error('Branch is undefined');
            if (!blobContent) throw Error('File content is undefined');
            if (isMainBranch(branchName)) throw Error(`Can not push to branch '${branchName}'. Create PR`);

            if (branch.name === 'main') {
                const smvLocker = await goshWallet.getSmvLocker();
                const smvBalance = smvLocker.meta?.votesTotal || 0;
                console.debug('[Blob create] - SMV balance:', smvBalance);
                if (smvBalance < 20) throw Error('Not enough tokens. Send at least 20 tokens to SMV.');
            };

            const [path] = splitByPath(pathName || '');

            
            if (branch.name === 'main') await goshWallet.lockVoting(0);

            const message = [values.title, values.message].filter((v) => !!v).join('\n\n');
            await goshWallet.createCommit(
                goshRepo,
                branch,
                userState.keys.public,
                [{
                    name: `${path && `${path}/`}${values.name}`,
                    modified: values.content,
                    original: blobContent
                }],
                message
            );

            await updateBranch(branch.name);
            navigate(branch.name === 'main' ? `/organizations/${daoName}/repositories/${repoName}/pull` : urlBack);
        } catch (e: any) {
            console.error(e.message);
            alert(e.message);
        }
    }

    useEffect(() => {
        const getBlob = async (repo: IGoshRepository, treeItem: TGoshTreeItem) => {
            const content = await getBlobContent(repo, treeItem.sha);
            setBlobContent(content);
        }

        if (goshRepo && treeItem) getBlob(goshRepo, treeItem);
    }, [goshRepo, treeItem]);

    useEffect(() => {
        if (monaco && pathName) {
            const language = getCodeLanguageFromFilename(monaco, pathName);
            setBlobCodeLanguage(language);
        }
    }, [monaco, pathName])

    return (
        <div className="bordered-block px-7 py-8">
            {monaco && pathName && blobContent !== undefined && (
                <Formik
                    initialValues={{
                        name: splitByPath(pathName)[1],
                        content: blobContent,
                        title: '',
                        message: ''
                    }}
                    validationSchema={Yup.object().shape({
                        name: Yup.string().required('Field is required'),
                        title: Yup.string().required('Field is required')
                    })}
                    onSubmit={onCommitChanges}
                >
                    {({ values, setFieldValue, isSubmitting }) => (
                        <Form>
                            <div className="flex gap-3 items-baseline justify-between ">
                                <div className="flex items-baseline">
                                    <Link
                                        to={`/${daoName}/${repoName}/tree/${branchName}`}
                                        className="font-medium text-extblue hover:underline"
                                    >
                                        {repoName}
                                    </Link>
                                    <span className="mx-2">/</span>
                                    <div>
                                        <Field
                                            name="name"
                                            inputProps={{
                                                className: '!text-sm !py-1.5',
                                                autoComplete: 'off',
                                                placeholder: 'Name of new file',
                                                disabled: true
                                            }}
                                        />
                                    </div>
                                    <span className="mx-2">in</span>
                                    <span>{branchName}</span>
                                </div>

                                <Link
                                    to={urlBack}
                                    className="btn btn--body px-3 py-1.5 text-sm !font-normal"
                                >
                                    Discard changes
                                </Link>
                            </div>

                            <div className="mt-5 border rounded overflow-hidden">
                                <Tab.Group
                                    defaultIndex={activeTab}
                                    onChange={(index) => setActiveTab(index)}
                                >
                                    <Tab.List
                                    >
                                        <Tab
                                            className={({ selected }) => classNames(
                                                'px-4 py-3 border-r text-sm',
                                                selected
                                                    ? 'bg-white border-b-white font-medium text-extblack'
                                                    : 'bg-transparent border-b-transparent text-extblack/70 hover:text-extblack'
                                            )}
                                        >
                                            Edit file
                                        </Tab>
                                        <Tab
                                            className={({ selected }) => classNames(
                                                'px-4 py-3 text-sm',
                                                selected
                                                    ? 'bg-white border-b-white border-r font-medium text-extblack'
                                                    : 'bg-transparent border-b-transparent text-extblack/70 hover:text-extblack'
                                            )}
                                        >
                                            Preview changes
                                        </Tab>
                                    </Tab.List>
                                    <Tab.Panels
                                        className="-mt-[1px] border-t"
                                    >
                                        <Tab.Panel>
                                            <BlobEditor
                                                language={blobCodeLanguage}
                                                value={values.content}
                                                onChange={(value) => setFieldValue('content', value)}
                                            />
                                        </Tab.Panel>
                                        <Tab.Panel>
                                            <BlobDiffPreview
                                                className="pt-[1px]"
                                                original={blobContent}
                                                modified={values.content}
                                                modifiedLanguage={blobCodeLanguage}
                                            />
                                        </Tab.Panel>
                                    </Tab.Panels>
                                </Tab.Group>
                            </div>

                            <FormCommitBlock
                                urlBack={urlBack}
                                isDisabled={!monaco || isSubmitting}
                                isSubmitting={isSubmitting}
                            />
                        </Form>
                    )}
                </Formik>
            )}
        </div>
    );
}

export default BlobUpdatePage;

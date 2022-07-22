import React, { useEffect, useState } from "react";
import { Field, Form, Formik } from "formik";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import * as Yup from "yup";
import { Tab } from "@headlessui/react";
import { classNames } from "../../utils";
import BlobEditor from "../../components/Blob/Editor";
import FormCommitBlock from "../BlobCreate/FormCommitBlock";
import { useMonaco } from "@monaco-editor/react";
import { TRepoLayoutOutletContext } from "../RepoLayout";
import { IGoshRepository, IGoshSnapshot } from "../../types/types";
import { getCodeLanguageFromFilename } from "../../utils";
import BlobDiffPreview from "../../components/Blob/DiffPreview";
import { GoshSnapshot } from "../../types/classes";
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
    const { daoName, repoName, branchName = 'main', blobName } = useParams();
    const { goshRepo, goshWallet } = useOutletContext<TRepoLayoutOutletContext>();
    const userState = useRecoilValue(userStateAtom);
    const { updateBranch } = useGoshRepoBranches(goshRepo);
    const branch = useRecoilValue(goshCurrBranchSelector(branchName));
    const navigate = useNavigate();
    const monaco = useMonaco();
    const [activeTab, setActiveTab] = useState<number>(0);
    const [snapshot, setSnapshot] = useState<IGoshSnapshot>();
    const [blobCodeLanguage, setBlobCodeLanguage] = useState<string>('plaintext');
    const urlBack = `/${daoName}/${repoName}/blob/${branchName}/${blobName}`;

    const onCommitChanges = async (values: TFormValues) => {
        try {
            if (!userState.keys) throw Error('Can not get user keys');
            if (!goshWallet) throw Error('Can not get GoshWallet');
            if (!repoName) throw Error('Repository is undefined');
            if (!branch) throw Error('Branch is undefined');
            if (!snapshot?.meta) throw Error('File content is undefined');

            const message = [values.title, values.message].filter((v) => !!v).join('\n\n');
            await goshWallet.createCommit(
                repoName,
                branch,
                userState.keys.public,
                [{
                    name: values.name,
                    modified: values.content,
                    original: snapshot.meta.content
                }],
                message
            );

            await updateBranch(branch.name);
            navigate(urlBack);
        } catch (e: any) {
            alert(e.message);
        }
    }

    useEffect(() => {
        const getSnapshot = async (repo: IGoshRepository, branch: string, blob: string) => {
            const snapAddr = await repo.getSnapshotAddr(branch, blob);
            const snapshot = new GoshSnapshot(repo.account.client, snapAddr);
            await snapshot.load();
            setSnapshot(snapshot);
        }

        if (goshRepo && branchName && blobName) getSnapshot(goshRepo, branchName, blobName);
    }, [goshRepo, branchName, blobName]);

    useEffect(() => {
        if (monaco && blobName) {
            const language = getCodeLanguageFromFilename(monaco, blobName);
            setBlobCodeLanguage(language);
        }
    }, [monaco, blobName])

    return (
        <div className="bordered-block px-7 py-8">
            {monaco && blobName && snapshot && (
                <Formik
                    initialValues={{
                        name: blobName,
                        content: snapshot.meta?.content || '',
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
                                                original={snapshot.meta?.content}
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

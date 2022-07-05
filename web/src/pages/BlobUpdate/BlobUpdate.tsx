import React, { useEffect, useState } from 'react';
import { Field, Form, Formik } from 'formik';
import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import * as Yup from 'yup';
import TextField from '../../components/FormikForms/TextField';
import { Tab } from '@headlessui/react';
import { classNames } from '../../utils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCode, faEye } from '@fortawesome/free-solid-svg-icons';
import BlobEditor from '../../components/Blob/Editor';
import FormCommitBlock from '../BlobCreate/FormCommitBlock';
import { useMonaco } from '@monaco-editor/react';
import { TRepoLayoutOutletContext } from '../RepoLayout';
import { IGoshRepository, IGoshWallet, TGoshTreeItem } from '../../types/types';
import { getCodeLanguageFromFilename, splitByPath, isMainBranch } from '../../helpers';
import BlobDiffPreview from '../../components/Blob/DiffPreview';
import { goshCurrBranchSelector } from '../../store/gosh.state';
import { useRecoilValue } from 'recoil';
import {
    useCommitProgress,
    useGoshRepoBranches,
    useGoshRepoTree,
} from '../../hooks/gosh.hooks';
import { userStateAtom } from '../../store/user.state';
import RepoBreadcrumbs from '../../components/Repo/Breadcrumbs';
import { EGoshError, GoshError } from '../../types/errors';
import { toast } from 'react-toastify';
import Spinner from '../../components/Spinner';
import { Buffer } from 'buffer';
import { GoshCommit, GoshSnapshot } from '../../types/classes';

type TFormValues = {
    name: string;
    content: string;
    title: string;
    message: string;
    tags: string;
};

const BlobUpdatePage = () => {
    const pathName = useParams()['*'];
    const { daoName, repoName, branchName = 'main' } = useParams();
    const navigate = useNavigate();
    const { goshRepo, goshWallet } = useOutletContext<TRepoLayoutOutletContext>();
    const monaco = useMonaco();
    const userState = useRecoilValue(userStateAtom);
    const { updateBranch } = useGoshRepoBranches(goshRepo);
    const branch = useRecoilValue(goshCurrBranchSelector(branchName));
    const goshRepoTree = useGoshRepoTree(goshRepo, branch, pathName, true);
    const treeItem = useRecoilValue(goshRepoTree.getTreeItem(pathName));
    const [activeTab, setActiveTab] = useState<number>(0);
    const [blob, setBlob] = useState<{ content: string | Buffer; isIpfs: boolean }>();
    const [blobCodeLanguage, setBlobCodeLanguage] = useState<string>('plaintext');
    const { progress, progressCallback } = useCommitProgress();

    const urlBack = `/${daoName}/${repoName}/blobs/${branchName}${
        pathName && `/${pathName}`
    }`;

    const onCommitChanges = async (values: TFormValues) => {
        try {
            if (!userState.keys) throw new GoshError(EGoshError.NO_USER);
            if (!goshWallet) throw new GoshError(EGoshError.NO_WALLET);
            if (!repoName) throw new GoshError(EGoshError.NO_REPO);
            if (!branch) throw new GoshError(EGoshError.NO_BRANCH);
            if (isMainBranch(branchName))
                throw new GoshError(EGoshError.PR_BRANCH, {
                    branch: branchName,
                });
            if (!goshWallet.isDaoParticipant)
                throw new GoshError(EGoshError.NOT_PARTICIPANT);
            if (values.content === blob?.content)
                throw new GoshError(EGoshError.FILE_UNMODIFIED);

            const [path] = splitByPath(pathName || '');
            const message = [values.title, values.message]
                .filter((v) => !!v)
                .join('\n\n');
            await goshWallet.createCommit(
                goshRepo,
                branch,
                userState.keys.public,
                [
                    {
                        name: `${path ? `${path}/` : ''}${values.name}`,
                        modified: values.content,
                        original: blob?.content ?? '',
                        isIpfs: blob?.isIpfs,
                    },
                ],
                message,
                values.tags,
                undefined,
                progressCallback
            );
            await updateBranch(branch.name);
            navigate(urlBack);
        } catch (e: any) {
            console.error(e.message);
            toast.error(e.message);
        }
    };

    useEffect(() => {
        const getBlob = async (
            wallet: IGoshWallet,
            repo: IGoshRepository,
            branch: string,
            treeItem: TGoshTreeItem,
            commitAddr: string
        ) => {
            let filepath = `${treeItem.path ? `${treeItem.path}/` : ''}`;
            filepath = `${filepath}${treeItem.name}`;

            const snapAddr = await repo.getSnapshotAddr(branch, filepath);
            console.debug(snapAddr);

            const commit = new GoshCommit(wallet.account.client, commitAddr);
            const commitName = await commit.getName();

            const snap = new GoshSnapshot(wallet.account.client, snapAddr);
            const data = await snap.getSnapshot(commitName, treeItem);
            if (Buffer.isBuffer(data.content)) {
                toast.error(EGoshError.FILE_BINARY);
                navigate(urlBack);
            } else setBlob(data);
        };

        if (goshWallet && goshRepo && branch?.name && branch.commitAddr && treeItem) {
            getBlob(goshWallet, goshRepo, branch.name, treeItem, branch.commitAddr);
        }
    }, [
        goshRepo,
        goshWallet,
        branch?.name,
        branch?.commitAddr,
        treeItem,
        urlBack,
        navigate,
    ]);

    useEffect(() => {
        if (monaco && pathName) {
            const language = getCodeLanguageFromFilename(monaco, pathName);
            setBlobCodeLanguage(language);
        }
    }, [monaco, pathName]);

    if (!goshWallet?.isDaoParticipant) return <Navigate to={urlBack} />;
    return (
        <div className="bordered-block py-8">
            <div className="px-4 sm:px-7">
                {goshRepoTree.tree && !treeItem && (
                    <div className="text-gray-606060 text-sm">File not found</div>
                )}
                {(!goshRepoTree.tree || (treeItem && blob === undefined)) && (
                    <div className="text-gray-606060 text-sm">
                        <Spinner className="mr-3" />
                        Loading file...
                    </div>
                )}
            </div>
            {monaco && pathName && blob !== undefined && (
                <Formik
                    initialValues={{
                        name: splitByPath(pathName)[1],
                        content: blob.content.toString(),
                        title: '',
                        message: '',
                        tags: '',
                    }}
                    validationSchema={Yup.object().shape({
                        name: Yup.string().required('Field is required'),
                        title: Yup.string().required('Field is required'),
                    })}
                    onSubmit={onCommitChanges}
                >
                    {({ values, setFieldValue, isSubmitting }) => (
                        <Form className="px-4 sm:px-7">
                            <div className="flex flex-wrap gap-3 items-baseline justify-between ">
                                <div className="flex flex-wrap items-baseline gap-y-2">
                                    <RepoBreadcrumbs
                                        daoName={daoName}
                                        repoName={repoName}
                                        branchName={branchName}
                                        pathName={pathName}
                                        pathOnly={true}
                                        isBlob={false}
                                    />
                                    <div>
                                        <Field
                                            name="name"
                                            component={TextField}
                                            inputProps={{
                                                className: '!text-sm !py-1.5',
                                                autoComplete: 'off',
                                                placeholder: 'Name of new file',
                                                disabled: true,
                                            }}
                                        />
                                    </div>
                                    <span className="mx-2">in</span>
                                    <span>{branchName}</span>
                                </div>

                                <button
                                    className="btn btn--body px-3 py-1.5 !text-sm !font-normal text-center w-full sm:w-auto"
                                    disabled={isSubmitting}
                                    onClick={() => navigate(urlBack)}
                                >
                                    Discard changes
                                </button>
                            </div>

                            <div className="mt-5 border rounded overflow-hidden">
                                <Tab.Group
                                    defaultIndex={activeTab}
                                    onChange={(index) => setActiveTab(index)}
                                >
                                    <Tab.List>
                                        <Tab
                                            className={({ selected }) =>
                                                classNames(
                                                    'px-4 py-3 border-r text-sm',
                                                    selected
                                                        ? 'bg-white border-b-white font-medium text-extblack'
                                                        : 'bg-transparent border-b-transparent text-extblack/70 hover:text-extblack'
                                                )
                                            }
                                        >
                                            <FontAwesomeIcon
                                                icon={faCode}
                                                size="sm"
                                                className="mr-1"
                                            />
                                            Edit file
                                        </Tab>
                                        <Tab
                                            className={({ selected }) =>
                                                classNames(
                                                    'px-4 py-3 text-sm',
                                                    selected
                                                        ? 'bg-white border-b-white border-r font-medium text-extblack'
                                                        : 'bg-transparent border-b-transparent text-extblack/70 hover:text-extblack'
                                                )
                                            }
                                        >
                                            <FontAwesomeIcon
                                                icon={faEye}
                                                size="sm"
                                                className="mr-1"
                                            />
                                            Preview changes
                                        </Tab>
                                    </Tab.List>
                                    <Tab.Panels className="-mt-[1px] border-t">
                                        <Tab.Panel>
                                            <BlobEditor
                                                language={blobCodeLanguage}
                                                value={values.content}
                                                onChange={(value) =>
                                                    setFieldValue('content', value)
                                                }
                                            />
                                        </Tab.Panel>
                                        <Tab.Panel>
                                            <BlobDiffPreview
                                                className="pt-[1px]"
                                                original={blob.content}
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
                                progress={progress}
                            />
                        </Form>
                    )}
                </Formik>
            )}
        </div>
    );
};

export default BlobUpdatePage;

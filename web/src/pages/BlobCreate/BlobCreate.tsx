import { useState } from 'react';
import { Field, Form, Formik } from 'formik';
import {
    Navigate,
    useNavigate,
    useOutletContext,
    useParams,
} from 'react-router-dom';
import { TRepoLayoutOutletContext } from '../RepoLayout';
import TextField from '../../components/FormikForms/TextField';
import { useMonaco } from '@monaco-editor/react';
import { getCodeLanguageFromFilename, isMainBranch } from '../../helpers';
import * as Yup from 'yup';
import { Tab } from '@headlessui/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCode, faEye } from '@fortawesome/free-solid-svg-icons';
import { classNames } from '../../utils';
import BlobEditor from '../../components/Blob/Editor';
import BlobPreview from '../../components/Blob/Preview';
import FormCommitBlock from './FormCommitBlock';
import { useRecoilValue } from 'recoil';
import { goshCurrBranchSelector } from '../../store/gosh.state';
import {
    useCommitProgress,
    useGoshRepoBranches,
    useGoshRepoTree,
} from '../../hooks/gosh.hooks';
import { userStateAtom } from '../../store/user.state';
import RepoBreadcrumbs from '../../components/Repo/Breadcrumbs';
import { EGoshError, GoshError } from '../../types/errors';
import { toast } from 'react-toastify';

type TFormValues = {
    name: string;
    content: string;
    title: string;
    message: string;
    tags: string;
};

const BlobCreatePage = () => {
    const pathName = useParams()['*'];
    const { daoName, repoName, branchName = 'main' } = useParams();
    const navigate = useNavigate();
    const { goshRepo, goshWallet } =
        useOutletContext<TRepoLayoutOutletContext>();
    const monaco = useMonaco();
    const userState = useRecoilValue(userStateAtom);
    const { updateBranch } = useGoshRepoBranches(goshRepo);
    const branch = useRecoilValue(goshCurrBranchSelector(branchName));
    const goshRepoTree = useGoshRepoTree(goshRepo, branch, pathName, true);
    const [activeTab, setActiveTab] = useState<number>(0);
    const [blobCodeLanguage, setBlobCodeLanguage] =
        useState<string>('plaintext');
    const { progress, progressCallback } = useCommitProgress();

    const urlBack = `/${daoName}/${repoName}/tree/${branchName}${
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

            const name = `${pathName ? `${pathName}/` : ''}${values.name}`;
            const exists = goshRepoTree.tree?.items.find(
                (item) =>
                    `${item.path ? `${item.path}/` : ''}${item.name}` === name
            );
            if (exists)
                throw new GoshError(EGoshError.FILE_EXISTS, { file: name });

            const message = [values.title, values.message]
                .filter((v) => !!v)
                .join('\n\n');
            await goshWallet.createCommit(
                goshRepo,
                branch,
                userState.keys.public,
                [
                    {
                        name,
                        modified: values.content,
                        original: '',
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

    if (!goshWallet?.isDaoParticipant) return <Navigate to={urlBack} />;
    return (
        <div className="bordered-block py-8">
            <Formik
                initialValues={{
                    name: '',
                    content: '',
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
                {({ values, setFieldValue, isSubmitting, handleBlur }) => (
                    <Form className="px-4 sm:px-7">
                        <div className="flex flex-wrap gap-3 items-baseline justify-between ">
                            <div className="flex flex-wrap items-baseline gap-y-2">
                                <RepoBreadcrumbs
                                    daoName={daoName}
                                    repoName={repoName}
                                    branchName={branchName}
                                    pathName={pathName}
                                    isBlob={false}
                                />
                                <div>
                                    <Field
                                        name="name"
                                        component={TextField}
                                        errorEnabled={false}
                                        inputProps={{
                                            className:
                                                '!text-sm !px-2.5 !py-1.5',
                                            autoComplete: 'off',
                                            placeholder: 'Name of new file',
                                            disabled:
                                                !monaco || activeTab === 1,
                                            onBlur: (e: any) => {
                                                // Formik `handleBlur` event
                                                handleBlur(e);

                                                // Resolve file code language by it's extension
                                                // and update editor
                                                const language =
                                                    getCodeLanguageFromFilename(
                                                        monaco,
                                                        e.target.value
                                                    );
                                                setBlobCodeLanguage(language);

                                                // Set commit title
                                                setFieldValue(
                                                    'title',
                                                    `Create ${e.target.value}`
                                                );
                                            },
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
                                        Edit new file
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
                                        Preview
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
                                        <BlobPreview
                                            language={blobCodeLanguage}
                                            value={values.content}
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
        </div>
    );
};

export default BlobCreatePage;

import React, { useState } from "react";
import { Field, Form, Formik } from "formik";
import { Link, Navigate, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { TRepoLayoutOutletContext } from "../RepoLayout";
import { useMonaco } from "@monaco-editor/react";
import { getCodeLanguageFromFilename, isMainBranch } from "../../utils/helpers";
import * as Yup from "yup";
import { Tab } from "@headlessui/react";

import { classNames } from "../../utils";
import BlobEditor from "../../components/Blob/Editor";
import BlobPreview from "../../components/Blob/Preview";
import FormCommitBlock from "./FormCommitBlock";
import { useRecoilValue } from "recoil";
import { goshCurrBranchSelector } from "../../store/gosh.state";
import { useGoshRepoBranches } from "../../hooks/gosh.hooks";
import { userStateAtom } from "../../store/user.state";
import { EGoshError, GoshError } from "../../types/errors";
import { toast } from "react-toastify";

import { Icon, FlexContainer, Flex, BranchSelect } from '../../components';
import Button from '@mui/material/Button';

import styles from './BlobCreate.module.scss';
import classnames from "classnames/bind";

const cnb = classnames.bind(styles);

type TFormValues = {
    name: string;
    content: string;
    title: string;
    message: string;
}

const BlobCreatePage = () => {
    const pathName = useParams()['*'];
    const { daoName, repoName, branchName = 'main' } = useParams();
    const navigate = useNavigate();
    const { goshRepo, goshWallet, goshRepoTree } = useOutletContext<TRepoLayoutOutletContext>();
    const monaco = useMonaco();
    const userState = useRecoilValue(userStateAtom);
    const { updateBranch } = useGoshRepoBranches(goshRepo);
    const branch = useRecoilValue(goshCurrBranchSelector(branchName));
    const [activeTab, setActiveTab] = useState<number>(0);

    const { branches } = useGoshRepoBranches(goshRepo);
    const [blobCodeLanguage, setBlobCodeLanguage] = useState<string>('plaintext');
    const urlBack = `/organizations/${daoName}/repositories/${repoName}/tree/${branchName}${pathName ? `/${pathName}` : ''}`;

    console.log(branchName);

    const onCommitChanges = async (values: TFormValues) => {
        try {
            if (!userState.keys) throw new GoshError(EGoshError.NO_USER);
            if (!goshWallet) throw new GoshError(EGoshError.NO_WALLET);
            if (!repoName) throw new GoshError(EGoshError.NO_REPO);
            if (!branch) throw new GoshError(EGoshError.NO_BRANCH);
            if (isMainBranch(branchName)) throw new GoshError(EGoshError.PR_BRANCH, { branch: branchName });
            if (!goshWallet.isDaoParticipant) throw new GoshError(EGoshError.NOT_PARTICIPANT);

            const name = `${pathName ? `${pathName}/` : ""}${values.name}`;
            const exists = goshRepoTree.tree.items.length ? goshRepoTree.tree.items.find((item) => (
                `${item.path && `${item.path}/`}${item.name}` === name
            )) : false;
            if (exists) throw new GoshError(EGoshError.FILE_EXISTS, { file: name });

            console.log([{ name, modified: values.content, original: '' }]);
            const message = [values.title, values.message].filter((v) => !!v).join('\n\n');
            await goshWallet.createCommit(
                goshRepo,
                branch,
                userState.keys.public,
                [{ name, modified: values.content, original: '' }],
                message
            );

            await updateBranch(branch.name);
            navigate(urlBack);
        } catch (e: any) {
            console.error(e.message);
            toast.error(e.message);
        }
    }

    if (!goshWallet?.isDaoParticipant) return <Navigate to={urlBack} />;

    return (
            <Formik
                initialValues={{ name: '', content: '', title: '', message: '' }}
                validationSchema={Yup.object().shape({
                    name: Yup.string().required('Field is required'),
                    title: Yup.string().required('Field is required')
                })}
                onSubmit={onCommitChanges}
            >
                {({ values, setFieldValue, isSubmitting, handleBlur }) => (

    <div className={cnb("header-row", "header")}>
    <Form>
      
      <FlexContainer
        direction="row"
        justify="space-between"
        align="center"
        className={cnb("header-actions")}
      >
        <Flex>
            <FlexContainer
                direction="row"
                justify="flex-start"
                align="center"
            >
                <Flex>
            <h2>
                <Link to={`/organizations/${daoName}`} className="font-semibold text-xl hover:underline">
                    {daoName}
                </Link>
                <span className={"color-black"}> / </span>

                    <Link
                        to={`/organizations/${daoName}/repositories/${repoName}/tree/${branchName}`}
                        className="font-medium text-extblue hover:underline"
                    >
                                    {repoName}
                                </Link>
                                </h2>
                </Flex>
                <Flex>
                                <h2>/</h2>
                </Flex>
                <Flex>
                                <div>
                                    <Field
                                        name="name"
                                        className={cnb("input-field", "input-filename")}
                                        autoComplete='off'
                                        placeholder='File name'
                                        disabled={!monaco || activeTab === 1}
                                        onBlur={(e: any) => {
                                            // Formik `handleBlur` event
                                            handleBlur(e);

                                            // Resolve file code language by it's extension
                                            // and update editor
                                            const language = getCodeLanguageFromFilename(
                                                monaco,
                                                e.target.value
                                            );
                                            setBlobCodeLanguage(language);
                                            // Set commit title
                                            setFieldValue('title', `Create ${e.target.value}`)
                                        }}
                                    />
                                </div>
                </Flex>
                <Flex>
                    <FlexContainer
                        direction="row"
                        justify="flex-start"
                        align="center"
                    >
                        <Flex>
                            <span className={cnb("color-faded", "in")}>in</span> </Flex>
                        <Flex>
                            <span>
                                <BranchSelect
                                    branch={branch}
                                    branches={branches}
                                    onChange={(selected) => {
                                        if (selected) {
                                            navigate(`/organizations/${daoName}/repositories/${repoName}/blobs/create/${selected.name}`);
                                        }
                                    }}
                                />
                            </span> 
                        </Flex>
                    </FlexContainer>
                
                </Flex>
            </FlexContainer>
        </Flex>
        <Flex>
          
            <Button
                color="inherit"
                size="small"
                className={cnb("btn-icon", "button-discard")}
                disableElevation
                disabled={isSubmitting}
                onClick={() => navigate(urlBack)}

                // icon={<Icon icon={"arrow-up-right"}/>}
                // iconAnimation="right"
                // iconPosition="after"
            > Discard changes</Button>
        </Flex>
      </FlexContainer>

                        <div className="mt-5 border rounded overflow-hidden">
                            <Tab.Group
                                defaultIndex={activeTab}
                                onChange={(index) => setActiveTab(index)}
                            >
                                <Tab.List
                                className={"menu-list"}
                                >
                                    <Tab
                                        className={({ selected }) => cnb("tabs-item", {"selected": selected})}
                                    >
                                        File editor
                                    </Tab>
                                    <Tab
                                        className={({ selected }) => cnb("tabs-item", {"selected": selected})}
                                    >
                                        Preview
                                    </Tab>
                                </Tab.List>
                                <Tab.Panels>
                                    <Tab.Panel
                                            className={cnb("text-editor-wrapper")}
                                    >
                                        <BlobEditor
                                            className={cnb("text-editor")}
                                            language={blobCodeLanguage}
                                            value={values.content}
                                            onChange={(value) => setFieldValue('content', value)}
                                        />
                                    </Tab.Panel>
                                    <Tab.Panel
                                            className={cnb("text-editor-wrapper", "text-editor-wrapper-preview")}
                                    >
                                        <BlobPreview
                                            className={cnb("text-editor", "text-editor-preview")}
                                            language={blobCodeLanguage}
                                            value={values.content}
                                        />
                                    </Tab.Panel>
                                </Tab.Panels>
                            </Tab.Group>
                        </div>

                        <FormCommitBlock<TFormValues>
                            values={values}
                            urlBack={urlBack}
                            isDisabled={!monaco || isSubmitting}
                            isSubmitting={isSubmitting}
                        />


                    </Form>
    </div>
                )}
            </Formik>
    );
}

export default BlobCreatePage;

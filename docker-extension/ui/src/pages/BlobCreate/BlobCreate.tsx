import React, { useState } from "react";
import { Field, Form, Formik } from "formik";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { TRepoLayoutOutletContext } from "../RepoLayout";
import { useMonaco } from "@monaco-editor/react";
import { getCodeLanguageFromFilename } from "../../utils";
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

import { Icon, FlexContainer, Flex } from '../../components';
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
    const { daoName, repoName, branchName = 'main' } = useParams();
    const { goshRepo, goshWallet } = useOutletContext<TRepoLayoutOutletContext>();
    const userState = useRecoilValue(userStateAtom);
    const { updateBranch } = useGoshRepoBranches(goshRepo);
    const branch = useRecoilValue(goshCurrBranchSelector(branchName));
    const navigate = useNavigate();
    const monaco = useMonaco();
    const [blobCodeLanguage, setBlobCodeLanguage] = useState<string>('plaintext');
    const [activeTab, setActiveTab] = useState<number>(0);
    const urlBack = `/organizations/${daoName}/repositories/${repoName}/tree/${branchName}`;

    const onCommitChanges = async (values: TFormValues) => {
        try {
            if (!userState.keys) throw Error('Can not get user keys');
            if (!goshWallet) throw Error('Can not get GoshWallet');
            if (!repoName) throw Error('Repository is undefined');
            if (!branch) throw Error('Branch is undefined');

            const message = [values.title, values.message].filter((v) => !!v).join('\n\n');
            await goshWallet.createCommit(
                repoName,
                branch,
                userState.keys.public,
                [{ name: values.name, modified: values.content, original: '' }],
                message
            );

            await updateBranch(branch.name);
            navigate(urlBack);
        } catch (e: any) {
            alert(e.message);
        }
    }

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
                                            setFieldValue('title', `Create ${e.target.value}`);
                                        }}
                                    />
                                </div>
                </Flex>
                <Flex>
                                <span className={cnb("color-faded", "in")}>in</span>
                                <span>{branchName}</span>
                
                </Flex>
            </FlexContainer>
        </Flex>
        <Flex>
          
            <Link to={urlBack} >
                  <Button
                      color="inherit"
                      size="small"
                      className={cnb("btn-icon", "button-discard")}
                      disableElevation
                      // icon={<Icon icon={"arrow-up-right"}/>}
                      // iconAnimation="right"
                      // iconPosition="after"
                  > Discard changes</Button>
            </Link>
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
                        <div className="divider"></div>

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

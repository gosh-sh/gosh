import React, { useState } from "react";
import { Field, Form, Formik, FormikHelpers } from "formik";
import { useMutation } from "react-query";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { Modal, Loader, FlexContainer, Flex, Icon } from "./../../components";
import BranchSelect from "../../components/BranchSelect";
import { TGoshBranch } from "../../types/types";
import { TRepoLayoutOutletContext } from "../RepoLayout";
import * as Yup from "yup";
import { useRecoilValue } from "recoil";
import { goshCurrBranchSelector } from "../../store/gosh.state";
import { useGoshRepoBranches } from "../../hooks/gosh.hooks";

import Button from '@mui/material/Button';
import InputBase from '@mui/material/InputBase';

import styles from './Branches.module.scss';
import classnames from "classnames/bind";

const cnb = classnames.bind(styles);


type TCreateBranchFormValues = {
    newName: string;
    from?: TGoshBranch;
}

export const BranchesPage = () => {
    const { daoName, repoName } = useParams();
    const { goshRepo, goshWallet } = useOutletContext<TRepoLayoutOutletContext>();
    const [branchName, setBranchName] = useState<string>('main');
    const { branches, updateBranches } = useGoshRepoBranches(goshRepo);
    const branch = useRecoilValue(goshCurrBranchSelector(branchName));
    const [search, setSearch] = useState<string>();
    const [branchesOnMutation, setBranchesOnMutation] = useState<string[]>([]);
    const navigate = useNavigate();
    const branchDeleteMutation = useMutation(
        (name: string) => {
            if (!repoName) throw Error('Repository name is undefined');
            return goshWallet.deleteBranch(repoName, name);
        },
        {
            onMutate: (variables) => {
                setBranchesOnMutation((value) => [...value, variables]);
            },
            onSuccess: () => updateBranches(),
            onError: (error: any) => {
                console.error(error);
                alert(error.message);
            },
            onSettled: (data, error, variables) => {
                setBranchesOnMutation((value) => value.filter((item) => item !== variables));
            }
        }
    )

    const onBranchCreate = async (
        values: TCreateBranchFormValues,
        helpers: FormikHelpers<any>
    ) => {
        try {
            if (!repoName) throw Error('Repository is undefined');
            if (!values.from) throw Error('From branch is undefined');

            await goshWallet.createBranch(
                repoName,
                values.newName,
                values.from.name,
                values.from.snapshot.length
            );
            await updateBranches();
            helpers.resetForm();
        } catch (e: any) {
            console.error(e);
            alert(e.message);
        }
    }

    const onBranchDelete = (name: string) => {
        if (window.confirm(`Delete branch '${name}'?`)) {
            branchDeleteMutation.mutate(name);
        }
    }

    return (
        <Modal
          show={true}
          wide={true}
          onHide={() => {
            navigate(`/organizations/${daoName}/repositories/${repoName}`);
          }}
        >
        <div className={cnb("modal-wide", "modal-branches")}>
                <h2 className="drag-up">Branches</h2>
            <div className="flex justify-between gap-4">
                <Formik
                    initialValues={{ newName: '', from: branch }}
                    onSubmit={onBranchCreate}
                    validationSchema={Yup.object().shape({
                        newName: Yup.string()
                            .notOneOf((branches).map((b) => b.name), 'Branch exists')
                            .required('Branch name is required')
                    })}
                >
                    {({ isSubmitting, setFieldValue }) => (
                        <Form>
                            <FlexContainer
                                direction="row"
                                justify="flex-start"
                                align="center"
                                className={cnb("new-branch")}
                            >
                                <Flex>
                                    <BranchSelect
                                        branch={branch}
                                        branches={branches}
                                        className={cnb("branch-fork")}
                                        onChange={(selected) => {
                                            if (selected) {
                                                setBranchName(selected?.name);
                                                setFieldValue('from', selected);
                                            }
                                        }}
                                    />
                                </Flex>
                                <Flex>
                                    <Icon icon="chevron-right"  className={cnb("branch-chevron")} />
                                </Flex>
                                <Flex>
                                    <Field
                                        name="newName"
                                        placeholder='Branch name'
                                        autoComplete='off'
                                        className={cnb("input-field", "branch-name")}
                                    />
                                </Flex>
                                <Flex>
                                    <Button
                                        color="primary"
                                        type="submit"
                                        size="medium"
                                        variant="contained"
                                        className={cnb("branch-button", "btn-icon")}
                                        disableElevation
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting && <Loader/>}
                                        Create branch
                                    </Button>
                                </Flex>
                            </FlexContainer>
                        </Form>
                    )}
                </Formik>

                <div className="input basis-1/4">

                <InputBase
                    className="input-field"
                    type="text"
                    placeholder="Search  (Disabled for now)"
                    disabled
                    onChange={(e: any) => setSearch(e.target.value)}
                />
                </div>
            </div>

            <div
                className={cnb("branches-list")}
            >
                {branches.map((branch, index) => (
                    <FlexContainer
                        key={index}
                        justify="space-between"
                        align="center"
                    >
                        <Flex className={cnb("branches-list-branch")}>
                            <Link
                                to={`/organizations/${daoName}/repositories/${repoName}/tree/${branch.name}`}
                                className="hover:underline"
                            >
                                {branch.name}
                            </Link>
                        </Flex>
                        <Flex>
                            {branch.name !== 'main' && (

                                <Button
                                    color="primary"
                                    type="submit"
                                    size="medium"
                                    className={cnb("branch-button", "btn-icon")}
                                    disableElevation
                                    onClick={() => onBranchDelete(branch.name)}
                                    disabled={branchDeleteMutation.isLoading && branchesOnMutation.indexOf(branch.name) >= 0}
                                    >
                                        {branchDeleteMutation.isLoading && branchesOnMutation.indexOf(branch.name) >= 0
                                            ? <Loader/>
                                            : <></>
                                        }
                                        <span className="ml-2">Delete</span>
                                </Button>
                            )}
                        </Flex>
                    </FlexContainer>
                ))}
            </div>
        </div>
        </Modal>
    );
}

export default BranchesPage;

import React, { useEffect, useState } from "react";
import { faChevronRight, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Field, Form, Formik, FormikHelpers } from "formik";
import { useMutation } from "react-query";
import { Link, useOutletContext, useParams } from "react-router-dom";
import BranchSelect from "../../components/BranchSelect";
import TextField from "../../components/FormikForms/TextField";
import Spinner from "../../components/Spinner";
import { TGoshBranch } from "../../types/types";
import { TRepoLayoutOutletContext } from "../RepoLayout";
import * as Yup from "yup";
import { useRecoilValue } from "recoil";
import { goshCurrBranchSelector } from "../../store/gosh.state";
import { useGoshRepoBranches } from "../../hooks/gosh.hooks";
import { isMainBranch } from "../../helpers";
import { EGoshError, GoshError } from "../../types/errors";
import { toast } from "react-toastify";


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
    const [search, setSearch] = useState<string>('');
    const [filtered, setFiltered] = useState<TGoshBranch[]>(branches);
    const [branchesOnMutation, setBranchesOnMutation] = useState<string[]>([]);

    const branchDeleteMutation = useMutation(
        (name: string) => {
            if (!goshWallet) throw new GoshError(EGoshError.NO_WALLET);
            return goshWallet.deleteBranch(goshRepo, name);
        },
        {
            onMutate: (variables) => {
                setBranchesOnMutation((value) => [...value, variables]);
            },
            onSuccess: () => updateBranches(),
            onError: (error: any) => {
                console.error(error);
                toast.error(error.message);
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
            if (!values.from) throw new GoshError(EGoshError.NO_BRANCH);
            if (!goshWallet) throw new GoshError(EGoshError.NO_WALLET);

            await goshWallet.deployBranch(goshRepo, values.newName.toLowerCase(), values.from.name);
            await updateBranches();
            helpers.resetForm();
        } catch (e: any) {
            console.error(e);
            toast.error(e.message);
        }
    }

    const onBranchDelete = (name: string) => {
        if (window.confirm(`Delete branch '${name}'?`)) {
            branchDeleteMutation.mutate(name);
        }
    }

    useEffect(() => {
        updateBranches();
    }, [updateBranches]);

    useEffect(() => {
        if (search) {
            const pattern = new RegExp(search, 'i');
            setFiltered(branches.filter((item) => item.name.search(pattern) >= 0));
        } else {
            setFiltered(branches);
        }
    }, [branches, search]);

    return (
        <div className="bordered-block px-7 py-8">
            <div className="flex flex-wrap justify-between gap-4">
                {goshWallet?.isDaoParticipant && (
                    <Formik
                        initialValues={{ newName: '', from: branch }}
                        onSubmit={onBranchCreate}
                        validationSchema={Yup.object().shape({
                            newName: Yup.string()
                                .matches(/^[\w-]+$/, 'Name has invalid characters')
                                .max(64, 'Max length is 64 characters')
                                .notOneOf((branches).map((b) => b.name), 'Branch exists')
                                .required('Branch name is required')
                        })}
                    >
                        {({ isSubmitting, setFieldValue }) => (
                            <Form className="grow sm:grow-0 flex flex-wrap items-center gap-3">
                                <div className="grow flex items-center">
                                    <BranchSelect
                                        branch={branch}
                                        branches={branches}
                                        onChange={(selected) => {
                                            if (selected) {
                                                setBranchName(selected?.name);
                                                setFieldValue('from', selected);
                                            }
                                        }}
                                        disabled={isSubmitting}
                                    />
                                    <span className="mx-3">
                                        <FontAwesomeIcon icon={faChevronRight} size="sm" />
                                    </span>
                                    <div className="grow">
                                        <Field
                                            className="w-full"
                                            name="newName"
                                            component={TextField}
                                            errorEnabled={false}
                                            inputProps={{
                                                placeholder: 'Branch name',
                                                autoComplete: 'off',
                                                className: '!text-sm !py-1.5',
                                                disabled: isSubmitting,
                                                onChange: (e: any) => {
                                                    setFieldValue('newName', e.target.value.toLowerCase());
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    className="btn btn--body px-3 py-1.5 !text-sm w-full sm:w-auto"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting && <Spinner className="mr-2" />}
                                    Create branch
                                </button>
                            </Form>
                        )}
                    </Formik>
                )}

                <div className="input basis-full md:basis-1/4">
                    <input
                        type="text"
                        className="element !text-sm !py-1.5"
                        placeholder="Search branch..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="mt-5 divide-y divide-gray-c4c4c4">
                {filtered.map((branch, index) => (
                    <div key={index} className="flex gap-4 items-center px-3 py-2 text-sm">
                        <div className="grow">
                            <Link
                                to={`/${daoName}/${repoName}/tree/${branch.name}`}
                                className="hover:underline"
                            >
                                {branch.name}
                            </Link>
                        </div>
                        <div>
                            {!isMainBranch(branch.name) && goshWallet?.isDaoParticipant && (
                                <button
                                    type="button"
                                    className="px-2.5 py-1.5 text-white text-xs rounded bg-rose-600
                                        hover:bg-rose-500 disabled:bg-rose-400"
                                    onClick={() => onBranchDelete(branch.name)}
                                    disabled={branchDeleteMutation.isLoading && branchesOnMutation.indexOf(branch.name) >= 0}
                                >
                                    {branchDeleteMutation.isLoading && branchesOnMutation.indexOf(branch.name) >= 0
                                        ? <Spinner size="xs" />
                                        : <FontAwesomeIcon icon={faTrash} size="sm" />
                                    }
                                    <span className="ml-2">Delete</span>
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default BranchesPage;

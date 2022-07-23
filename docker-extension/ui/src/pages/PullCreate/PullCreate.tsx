import React, { useEffect, useState } from "react";
import { useMonaco } from "@monaco-editor/react";
import { Field, Form, Formik } from "formik";
import { useNavigate, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { useRecoilValue } from "recoil";
import BlobDiffPreview from "../../components/Blob/DiffPreview";
import { getCodeLanguageFromFilename, getRepoTree } from "../../utils";

import { goshBranchesAtom, goshCurrBranchSelector } from "../../store/gosh.state";
import { TRepoLayoutOutletContext } from "../RepoLayout";
import * as Yup from "yup";
import FormCommitBlock from "./FormCommitBlock";
import { BranchSelect, FlexContainer, Flex, Icon, Loader} from "../../components";
import Button from '@mui/material/Button';
import { useGoshRepoBranches } from "../../hooks/gosh.hooks";
import { userStateAtom } from "../../store/user.state";
import { IGoshBlob, TGoshTreeItem } from "../../types/types";
import { GoshBlob } from "../../types/classes";
import { ChevronRightIcon } from '@heroicons/react/outline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';

import styles from './PullCreate.module.scss';
import classnames from "classnames/bind";
import { Typography } from "@mui/material";

const cnb = classnames.bind(styles);

type TFormValues = {
    name: string;
    content: string;
    title: string;
    message: string;
}

type TCommitFormValues = {
    title: string;
    message?: string;
    deleteBranch?: boolean;
}

const PullCreatePage = () => {
    const { goshRepo, goshWallet } = useOutletContext<TRepoLayoutOutletContext>();
    const { daoName, repoName } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const userState = useRecoilValue(userStateAtom);
    const branches = useRecoilValue(goshBranchesAtom);
    const { updateBranches } = useGoshRepoBranches(goshRepo);
    const branchFrom = useRecoilValue(
        goshCurrBranchSelector(searchParams.get('from') || 'main')
    );
    const branchTo = useRecoilValue(
        goshCurrBranchSelector(searchParams.get('to') || 'main')
    );
    const [compare, setCompare] = useState<{ to?: any, from?: any }[]>();
    const monaco = useMonaco();

    useEffect(() => {
        const getBlob = async (hash: string): Promise<IGoshBlob> => {
            const addr = await goshRepo.getBlobAddr(`blob ${hash}`);
            const blob = new GoshBlob(goshRepo.account.client, addr);
            await blob.load();
            return blob;
        }

        const onCompare = async () => {
            try {
                if (!branchFrom) throw Error('[Compare]: From branch is undefined');
                if (!branchTo) throw Error('[Compare]: To branch in undefined');
                if (branchFrom.name === branchTo.name) {
                    setCompare([]);
                    return;
                };

                setCompare(undefined);
                const fromTree = await getRepoTree(goshRepo, branchFrom);
                const fromTreeItems = [...fromTree.items].filter((item) => item.type === 'blob');
                console.debug('[Pull create] - From tree blobs:', fromTreeItems);
                const toTree = await getRepoTree(goshRepo, branchTo);
                const toTreeItems = [...toTree.items].filter((item) => item.type === 'blob');
                console.debug('[Pull create] - To tree blobs:', toTreeItems);

                // Find items that exist in both trees and were changed
                const intersected = toTreeItems.filter((item) => {
                    return fromTreeItems.find((fItem) => (
                        fItem.path === item.path &&
                        fItem.name === item.name &&
                        fItem.sha !== item.sha
                    ));
                });
                console.debug('[Pull crreate] - Intersected:', intersected);

                // Find items that where added by `fromBranch`
                const added = fromTreeItems.filter((item) => {
                    return !toTreeItems.find((tItem) => (
                        tItem.path === item.path &&
                        tItem.name === item.name
                    ));
                });
                console.debug('[Pull crreate] - Added:', added);

                // Merge intersected and added and generate compare list
                const compare: {
                    to?: { item: TGoshTreeItem; blob: IGoshBlob; },
                    from?: { item: TGoshTreeItem; blob: IGoshBlob; }
                }[] = [];
                for (let i = 0; i < intersected.length; i += 20) {
                    const chunk = intersected.slice(i, i + 20);
                    await new Promise((resolve) => setInterval(resolve, 1000));
                    await Promise.all(
                        chunk.map(async (item) => {
                            const from = fromTreeItems.find((fItem) => fItem.path === item.path && fItem.name === item.name);
                            const to = toTreeItems.find((tItem) => tItem.path === item.path && tItem.name === item.name);
                            if (from && to) {
                                const fromBlob = await getBlob(from.sha);
                                const toBlob = await getBlob(to.sha);
                                compare.push({ to: { item: to, blob: toBlob }, from: { item: from, blob: fromBlob } });
                            }
                        })
                    );
                }

                for (let i = 0; i < added.length; i += 20) {
                    const chunk = added.slice(i, i + 20);
                    await new Promise((resolve) => setInterval(resolve, 1000));
                    await Promise.all(
                        chunk.map(async (item) => {
                            const fromBlob = await getBlob(item.sha);
                            compare.push({ to: undefined, from: { item, blob: fromBlob } });
                        })
                    );
                }

                console.debug('[Pull create] - Compare list:', compare);
                setCompare(compare);
            } catch (e: any) {
                console.error(e.message);
                alert(e.message);
            }
        }

        if (goshRepo && branchFrom && branchTo) onCompare();

        return () => { }
    }, [branchFrom, branchTo, goshRepo]);

    const onCommitMerge = async (values: TCommitFormValues) => {
        try {
            if (!userState.keys) throw Error('Can not get user keys');
            if (!repoName) throw Error('[Merge]: Repository is undefined');
            if (!branchFrom) throw Error('[Merge]: From branch is undefined');
            if (!branchTo) throw Error('[Merge]: To branch in undefined');
            if (branchFrom.name === branchTo.name) throw Error('[Merge]: Banches are equal');
            if (!compare?.length) throw Error('[Merge]: There are no changes to merge');

            // Prepare blobs
            const blobs = compare.map(({ from, to }) => {
                if (!from.item || !from.blob.meta) throw new Error('Empty file from');
                return {
                    name: `${from.item.path ? `${from.item.path}/` : ''}${from.item.name}`,
                    modified: from.blob.meta?.content,
                    original: to?.blob.meta?.content || ''
                }
            });
            console.debug('Blobs', blobs);

            if (branchTo.name === 'main') {
                const smvLocker = await goshWallet.getSmvLocker();
                const smvBalance = smvLocker.meta?.votesTotal || 0;
                console.debug('[Blob create] - SMV balance:', smvBalance);
                if (smvBalance < 20) throw Error('Not enough tokens. Send at least 20 tokens to SMV.');
            };

            const message = [values.title, values.message].filter((v) => !!v).join('\n\n');
            await goshWallet.createCommit(
                goshRepo,
                branchTo,
                userState.keys.public,
                blobs,
                message,
                branchFrom
            );

            // Delete branch after merge (if selected), update branches, redirect
            if (values.deleteBranch) await goshWallet.deleteBranch(goshRepo, branchFrom.name);

            await updateBranches();
            navigate(
                branchTo.name === 'main'
                    ? `/organizations/${daoName}/repositories/${repoName}/pull`
                    : `/organizations/${daoName}/repositories/${repoName}/tree/${branchTo.name}`, { replace: true }
            );

        } catch (e: any) {
            console.error(e.message);
            alert(e.message);
        }
    }

    return (<>
        <div className="actions">
            
            <FlexContainer
                    direction="row"
                    justify="flex-start"
                    align="center"
                    className={cnb("repository-actions")}
                >
                    <Flex>
                        <BranchSelect
                            branch={branchFrom}
                            branches={branches}
                            onChange={(selected) => {
                                navigate(`/organizations/${daoName}/repositories/${repoName}/pull?from=${selected?.name}&to=${branchTo?.name}`);
                            }}
                        />
                    </Flex>
                    <Flex>
                        <span className="icon icon-chevron-branches"><ChevronRightIcon/></span>
                    </Flex>
                    <Flex>
                        <BranchSelect
                            branch={branchTo}
                            branches={branches}
                            onChange={(selected) => {
                                navigate(`/organizations/${daoName}/repositories/${repoName}/pull?from=${branchFrom?.name}&to=${selected?.name}`);
                            }}
                        />
                    </Flex>
                    {/* <Flex
                        grow={1000}
                    >

                        <Button
                            color="primary"
                            size="small"
                            variant="contained"
                            className={cnb("button-create", "btn-icon")}
                            disableElevation
                            disabled={branchFrom?.name === branchTo?.name}
                            onClick={() => {
                                navigate(`/organizations/${daoName}/repositories/${repoName}/pull/create?from=${branchFrom?.name}&to=${branchTo?.name}`);
                            }}
                        >
                            Create pull request
                        </Button>
                
                    </Flex> */}
                </FlexContainer>
                </div>
        <div className={cnb("tree")}>
            

            <div className="mt-5">
                {compare === undefined && (
                    <div className="loader">
                        <Loader/>
                        Loading diff...
                    </div>
                )}

                {compare && !compare.length && (
                    <Typography className="text-sm text-gray-606060 text-center">
                        There is nothing to merge
                    </Typography>
                )}

                {compare?.map(({ to, from }, index) => {
                    const item = to?.item || from?.item;
                    const fileName = `${item.path ? `${item.path}/` : ''}${item.name}`;

                    if (!fileName) return null;

                    const language = getCodeLanguageFromFilename(monaco, fileName);
                    return (<>
                        <div key={index+"name"} className="bg-gray-100 border-b px-3 py-1.5 text-sm font-semibold">
                            {fileName}
                        </div>
                        <div key={index} className={cnb("text-editor-wrapper", "text-editor-wrapper-preview")}>
                            <BlobDiffPreview
                                className={cnb("text-editor")}
                                original={to?.blob.meta?.content}
                                modified={from?.blob.meta?.content}
                                modifiedLanguage={language}
                            />
                        </div>
                    </>);
                })}
            </div>

            <div className="divider"></div>

            {!!compare?.length && (
                <div className="mt-5">
                    <Formik
                        initialValues={{
                            title: `Merge branch '${branchFrom?.name}' into '${branchTo?.name}'`
                        }}
                        onSubmit={onCommitMerge}
                        validationSchema={Yup.object().shape({
                            title: Yup.string().required('Field is required')
                        })}
                    >
                        {({ isSubmitting, handleChange, values }) => (
                            <Form>
                                <FormCommitBlock
                                    values={values}
                                    isDisabled={!monaco || isSubmitting}
                                    isSubmitting={isSubmitting}
                                    extraFields={branchFrom?.name !== 'main' && (

                                        <div className="form-checkbox">
                
                                        <FormControlLabel
                                            control={<Checkbox
                                                value={values.deleteBranch}
                                                name="deleteBranch"
                                                onChange={handleChange}
                                                icon={<RadioButtonUncheckedIcon />}
                                                checkedIcon={<RadioButtonCheckedIcon />}
                                            />}
                                            label={<>Delete <span style={{fontWeight: 650}}>{branchFrom?.name}</span> branch after merge</>}
                                        />
                                        </div>
                                    )}
                                />
                            </Form>
                        )}
                    </Formik>
                </div>
            )}
        </div>
        </>
    );
}

export default PullCreatePage;

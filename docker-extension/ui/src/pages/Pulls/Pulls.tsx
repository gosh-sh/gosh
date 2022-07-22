import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useRecoilValue } from "recoil";
import BranchSelect from "../../components/BranchSelect";
import { goshBranchesAtom, goshCurrBranchSelector } from "../../store/gosh.state";
import { TGoshBranch } from "../../types/types";

import Button from '@mui/material/Button';
import { Modal, Loader, FlexContainer, Flex, Icon } from "./../../components";

import { Typography } from "@mui/material";
import styles from './Pulls.module.scss';
import classnames from "classnames/bind";

const cnb = classnames.bind(styles);

const PullsPage = () => {
    const { daoName, repoName } = useParams();
    const navigate = useNavigate();
    const branches = useRecoilValue(goshBranchesAtom);
    const defaultBranch = useRecoilValue(goshCurrBranchSelector('main'));
    const [branchFrom, setBranchFrom] = useState<TGoshBranch | undefined>(defaultBranch);
    const [branchTo, setBranchTo] = useState<TGoshBranch | undefined>(defaultBranch);

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
                                if (selected) {
                                    setBranchFrom(selected);
                                }
                            }}
                        />
                    </Flex>
                    <Flex>
                        <BranchSelect
                            branch={branchTo}
                            branches={branches}
                            onChange={(selected) => {
                                if (selected) {
                                    setBranchTo(selected);
                                }
                            }}
                        />
                    </Flex>
                    <Flex
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
                                navigate(`/${daoName}/${repoName}/pulls/create?from=${branchFrom?.name}&to=${branchTo?.name}`);
                            }}
                        >
                            Create pull request
                        </Button>
                
                    </Flex>
                </FlexContainer>
                </div>
            <div className={cnb("tree")}>

                        <Typography>Generic only pull requests are available now</Typography>
            </div>
        </>
    );
}

export default PullsPage;

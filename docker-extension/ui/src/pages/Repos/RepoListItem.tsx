import React from "react";
import { Link } from "react-router-dom";
import CopyClipboard from "./../../components/CopyClipboard";
import { IGoshRepository } from "./../../types/types";
import { shortString } from "./../../utils";

import { Loader, LoaderDotsText, FlexContainer, Flex, Icon } from "./../../components";
import { CodeIcon, UsersIcon, ArrowRightIcon } from '@heroicons/react/outline';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';


type TRepositoryListItemProps = {
    daoName: string;
    repository: IGoshRepository
}

const RepositoryListItem = (props: TRepositoryListItemProps) => {
    const { daoName, repository } = props;

    return (
        <div className="py-3">

            <Link
                to={`/organizations/${daoName}/repositories/${repository.meta?.name}`}
            >
                <FlexContainer
                  className="organization"
                  direction="column"
                  justify="space-between"
                  align="stretch"
                >
                  <Flex>
                    <div className="arrow"><ArrowRightIcon/></div>
                    <div className="organization-title">
                        {repository.meta?.name}
                    </div>
                    <div className="organization-description">
                      This is a Gosh test repository
                    </div>

                    <FlexContainer
                      direction="row"
                      justify="justify-content"
                      align="center"
                    >
                        <Flex
                            grow={100}
                            >
                            <div className="organization-badges">
                                {['gosh', 'vcs', 'ever', 'use', 'enjoy'].map((value, index) => (
                                    <Chip
                                        size="small"
                                        key={index}
                                        className="tag-badge"
                                        label={value}
                                    />
                                ))}
                            </div>
                        </Flex>
                        <Flex
                            onClick={e => {
                                e.stopPropagation();
                                e.preventDefault();
                            }}
                        >
                            <CopyClipboard
                                componentProps={{
                                    text: repository.address
                                }}
                                label={<Typography>{shortString(repository.address)}</Typography>}
                            />
                      </Flex>

                    </FlexContainer>

                  </Flex>
                  <Flex
                    className="organization-footer"
                  >
                    <FlexContainer
                      direction="row"
                      justify="flex-start"
                      align="center"
                    >
                      <Flex>
                        <div className="badge"><CodeIcon/> <LoaderDotsText className={"badge-loader"}/> language</div>
                      </Flex>
                      <Flex>
                        <div className="badge"><Icon icon="branches"/>{repository.meta?.branchCount} {(repository.meta?.branchCount && repository.meta?.branchCount === 1) ? "branch" : "branches"}</div>
                      </Flex>
                      <Flex>
                        <div className="badge"><UsersIcon/> <LoaderDotsText className={"badge-loader"}/> commits</div>
                      </Flex>
                    </FlexContainer>
                  </Flex>
                </FlexContainer>
              </Link>

        </div>
    );
}

export default RepositoryListItem;

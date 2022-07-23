import React from "react";
import { Link } from "react-router-dom";
import CopyClipboard from "../../components/CopyClipboard";
import { IGoshCommit, IGoshSmvProposal } from "../../types/types";
import { shortString } from "../../utils";

import { Loader, LoaderDotsText, FlexContainer, Flex, Icon } from "../../components";
import { ThumbDownIcon, ThumbUpIcon, ArrowRightIcon, ArrowNarrowRightIcon } from '@heroicons/react/outline';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import moment from "moment";

import styles from './Events.module.scss';
import classnames from "classnames/bind";

const cnb = classnames.bind(styles);


type TRepositoryListItemProps = {
  daoName: string | undefined,
  event: {
    prop: IGoshSmvProposal;
    commit?: IGoshCommit | undefined;
    locked: number;
}
}

const EventsListItem = (props: TRepositoryListItemProps) => {
    const { event, daoName } = props;

    return (
      <Link
          to={`/organizations/${daoName}/events/${event.prop.address}`}
          className="text-lg font-semibold hover:underline"
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
            {event.commit?.meta?.content.title}
          </div>
          <div className="organization-description-alt">

            {event.prop.meta?.commit.repoName}:{event.prop.meta?.commit.branchName}
            </div>

          


          <FlexContainer
            direction="row"
            justify="justify-content"
            align="center"
            onClick={e => {
                e.stopPropagation();
                e.preventDefault();
            }}
            style={{paddingTop: "1rem"}}
          >
              <Flex grow={1}>
              <CopyClipboard
                label={<Typography>{`${'Commit: '}${shortString(event.prop.meta?.commit.commitName || '')}`}</Typography>}
                componentProps={{
                    text: event.prop.meta?.commit.commitName || ''
                }}
            />
              </Flex>
              <Flex>
                <CopyClipboard
                    label={<Typography>{`${'Proposal: '}${shortString(event.prop.meta?.id || '')}`}</Typography>}
                    componentProps={{
                        text: event.prop.meta?.id || ''
                    }}
                  />
            </Flex>

          </FlexContainer>

        </Flex>
        <Flex
          className="organization-footer"
        >

          <FlexContainer
            direction="row"
            justify="space-between"
            align="flex-start"
          >
            <Flex
              grow={1}
            >
              <div className="organization-description">
                <FlexContainer
                  justify="flex-start"
                  align="center"
                >
                  <Flex className="organization-description-date">
                    {moment(event.prop.meta?.time.start).format("MMMM Do YYYY")}
                    <div>{moment(event.prop.meta?.time.start).format("h:mm a")}</div>
                  </Flex>
                  <Flex>
                    <span className="icon icon-arrow"><ArrowNarrowRightIcon/></span>
                  </Flex>
                  <Flex className="organization-description-date">
                    {moment(event.prop.meta?.time.finish).format("MMMM Do YYYY")}
                    <div>{moment(event.prop.meta?.time.finish).format("h:mm a")}</div>
                   </Flex>
                  </FlexContainer>
                </div>
              </Flex>
              <Flex
                className={cnb("align-right", "running-indicator", {"color-faded": event.prop.meta?.isCompleted})}
              >
                  {event.prop.meta?.isCompleted
                      ? <Typography className="color-success" style={{lineHeight: "1rem"}}>Completed</Typography>
                      : (<Typography className={"loader"} style={{lineHeight: "1rem"}}><Loader /> Running</Typography>)
                  }
              
                <FlexContainer
                  justify="flex-start"
                  align="flex-end"
                >
                    <Flex className="icon icon-thumb">
                      <ThumbUpIcon/>{event.prop.meta?.votes.yes}
                    </Flex>
                    <Flex>
                      &nbsp;
                    </Flex>
                    <Flex className="icon icon-thumb">
                      <ThumbDownIcon/>{event.prop.meta?.votes.no}
                    </Flex>
                </FlexContainer>
              </Flex>
              {/* {!!event.locked && event.prop.isCompleted && (
                  <div>
                      <button
                          type="button"
                          className="btn btn--body text-sm px-4 py-1.5"
                          onClick={() => { }}
                      >
                          Release
                      </button>
                  </div>
              )} */}
          </FlexContainer>
                  </Flex>
                </FlexContainer>
                  </Link>
    );
}

export default EventsListItem;

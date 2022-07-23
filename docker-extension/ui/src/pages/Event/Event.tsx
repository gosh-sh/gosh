import React, { useEffect, useState } from "react";
import { Field, Form, Formik } from "formik";
import { Link, useOutletContext, useParams } from "react-router-dom";
import InputBase from '@mui/material/InputBase';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import {
    GoshBlob,
    GoshCommit,
    GoshRepository,
    GoshSmvClient,
    GoshSmvLocker,
    GoshSmvProposal
} from "../../types/classes";
import {
    IGoshBlob,
    IGoshCommit,
    IGoshRepository,
    IGoshRoot,
    IGoshSmvLocker,
    IGoshSmvProposal,
    IGoshWallet
} from "../../types/types";
import * as Yup from "yup";
import CopyClipboard from "../../components/CopyClipboard";
import { classNames, shortString } from "../../utils";
import { getBlobContent, getCodeLanguageFromFilename, getCommitTree } from "../../utils/helpers";
import BlobDiffPreview from "../../components/Blob/DiffPreview";
import { useGoshRoot } from "../../hooks/gosh.hooks";
import { useMonaco } from "@monaco-editor/react";
import { TDaoLayoutOutletContext } from "../Dao";
import { EGoshError, GoshError } from "../../types/errors";
import { toast } from "react-toastify";

import { Loader, LoaderDotsText, FlexContainer, Flex, Modal } from "./../../components";
import { ThumbDownIcon, ThumbUpIcon, ArrowRightIcon, ArrowNarrowRightIcon, DotsHorizontalIcon } from '@heroicons/react/outline';
import { EmojiSadIcon } from '@heroicons/react/outline';

import styles from './Event.module.scss';
import classnames from "classnames/bind";
import { Typography } from "@mui/material";
import moment from "moment";

const cnb = classnames.bind(styles);

const StatusDot  = ({status}: {status: string}) => <div className={cnb("status-dot", status)}></div>


type TFormValues = {
  approve: string;
  amount: number;
}

const EventPage = () => {
  const { daoName, eventAddr } = useParams();
  const { goshDao, goshWallet } = useOutletContext<TDaoLayoutOutletContext>();
  const goshRoot = useGoshRoot();
  const monaco = useMonaco();
  const [release, setRelease] = useState<boolean>(false);
  const [check, setCheck] = useState<boolean>(false);
  const [service, setService] = useState<{
      proposal?: IGoshSmvProposal;
      proposalLocked: number;
      locker?: IGoshSmvLocker;
      balance: number;
      repo?: IGoshRepository;
      commit?: IGoshCommit;
      blobs?: {
          name: string;
          curr: IGoshBlob;
          currContent: string;
          prevContent?: string;
      }[];
  }>();

  const getCommit = async (repo: IGoshRepository, name: string): Promise<[IGoshCommit, any[]]> => {
      // Get commit data
      const address = await repo.getCommitAddr(name);
      const commit = new GoshCommit(repo.account.client, address);
      await commit.load();

      // Get commit blobs
      const blobAddrs = await commit.getBlobs();
      const blobTrees: IGoshBlob[] = [];
      const blobs: {
          name: string;
          curr: IGoshBlob;
          currContent: string;
          prevContent?: string;
      }[] = [];
      await Promise.all(
          blobAddrs.map(async (addr) => {
              // Create blob and load it's data
              const blob = new GoshBlob(repo.account.client, addr);
              await blob.load();
              if (!blob.meta) throw new GoshError(EGoshError.META_LOAD, { type: 'file', address: addr });

              // Extract tree blob from common blobs
              if (blob.meta.name.indexOf('tree ') >= 0) blobTrees.push(blob);
              else {
                  const currFullBlob = await getBlobContent(repo, blob.meta.name);
                  // If blob has prevSha, load this prev blob
                  let prevFullBlob = undefined;
                  if (blob.meta?.prevSha) {
                      prevFullBlob = await getBlobContent(repo, blob.meta.prevSha);
                  }
                  blobs.push({ name: '', curr: blob, currContent: currFullBlob, prevContent: prevFullBlob });
              }
          })
      );
      console.debug('Trees blobs', blobTrees);
      console.debug('Common blobs', blobs);

      // Construct commit tree
      const filesList = blobTrees
          .map((blob) => blob.meta?.content || '')
          .reduce((a: string[], content) => [...a, ...content.split('\n')], []);
      console.debug('Files list', filesList);
      const commitTree = getCommitTree(filesList);
      console.debug('Commit tree', commitTree);

      // Update blobs names (path) from tree
      Object.values(commitTree).forEach((items) => {
          items.forEach((item) => {
              const found = blobs.find((bItem) => (
                  bItem.curr.meta?.name === `${item.type} ${item.sha}`
              ));
              if (found) found.name = item.name;
          })
      });
      console.debug('Ready to render blobs', blobs);

      return [commit, blobs];
  }

  const onProposalCheck = async (proposal: IGoshSmvProposal, wallet: IGoshWallet) => {
      try {
          if (service?.locker?.meta?.isBusy) throw new GoshError(EGoshError.SMV_LOCKER_BUSY);
          setCheck(true);
          await wallet.tryProposalResult(proposal.address);
          toast.success('Re-check submitted. Please, wait a bit for data to be updated or check status later');
      } catch (e: any) {
          console.error(e.message);
          toast.error(e.message);
      } finally {
          setCheck(false);
      }
  }

  const onProposalSubmit = async (values: TFormValues) => {
      try {
          if (!goshRoot) throw new GoshError(EGoshError.NO_ROOT);
          if (!goshDao) throw new GoshError(EGoshError.NO_DAO);
          if (!goshWallet) throw new GoshError(EGoshError.NO_WALLET);
          if (!service?.proposal) throw new GoshError(EGoshError.SMV_NO_PROPOSAL);

          if (service.proposal.meta?.time.start && Date.now() < service.proposal.meta?.time.start.getTime()) {
              throw new GoshError(
                  EGoshError.SMV_NO_START,
                  { start: service.proposal.meta?.time.start.getTime() }
              );
          }
          if (service.locker?.meta?.isBusy) throw new GoshError(EGoshError.SMV_LOCKER_BUSY);

          const smvPlatformCode = await goshRoot.getSmvPlatformCode();
          const smvClientCode = await goshDao.getSmvClientCode();
          const choice = values.approve === 'true';
          await goshWallet.voteFor(
              smvPlatformCode,
              smvClientCode,
              service.proposal.address,
              choice,
              values.amount
          );
          toast.success('Vote accepted. Please, wait a bit for data to be updated or check status later');
      } catch (e: any) {
          console.error(e.message);
          toast.error(e.message);
      }
  }

  const onTokensRelease = async () => {
      try {
          if (!goshWallet) throw new GoshError(EGoshError.NO_WALLET);
          if (!service?.proposal) throw new GoshError(EGoshError.SMV_NO_PROPOSAL);

          setRelease(true);
          await goshWallet.updateHead();
      } catch (e: any) {
          console.error(e.message);
          toast.error(e.message);
      } finally {
          setRelease(false);
      }
  }

  useEffect(() => {
      const getGoshPull = async (root: IGoshRoot, eventAddr: string, wallet?: IGoshWallet) => {
          // Get GoshProposal object
          const prop = new GoshSmvProposal(root.account.client, eventAddr);
          await prop.load();
          if (!prop.meta || !daoName || !goshRoot) {
              toast.error('Error loading proposal');
              return;
          }

          // Get repository and commit with blobs
          const repoAddr = await root.getRepoAddr(
              prop.meta.commit.repoName,
              daoName
          );
          const repo = new GoshRepository(root.account.client, repoAddr);
          const [commit, blobs] = await getCommit(repo, prop.meta.commit.commitName);

          // Get SMVLocker
          let locker: IGoshSmvLocker | undefined;
          let balance = 0;
          if (wallet?.isDaoParticipant) {
              const lockerAddr = await wallet.getSmvLockerAddr();
              locker = new GoshSmvLocker(wallet.account.client, lockerAddr);
              await locker.load();
              balance = await wallet.getSmvTokenBalance();
          }

          setService({
              proposal: prop,
              proposalLocked: 0,
              locker,
              balance,
              repo,
              commit,
              blobs
          });
      }

      if (goshRoot && eventAddr && !service?.locker && !service?.proposal) {
          getGoshPull(goshRoot, eventAddr, goshWallet);
      }
      let interval: any;
      if (goshWallet && service?.locker && service?.proposal) {
          interval = setInterval(async () => {
              await service.locker?.load();
              await service.proposal?.load();
              const balance = await goshWallet.getSmvTokenBalance();

              let proposalLocked = 0;
              try {
                  if (service.locker && service.proposal?.meta) {
                      const smvClientAddr = await goshWallet.getSmvClientAddr(service.locker.address, service.proposal.meta.id);
                      const client = new GoshSmvClient(goshWallet.account.client, smvClientAddr);
                      proposalLocked = await client.getLockedAmount();
                  }
              }
              catch { }

              console.debug('[Locker] - Busy:', service.locker?.meta?.isBusy);
              setService((prev) => ({ ...prev, balance, proposalLocked }));
          }, 5000);
      }

      return () => {
          clearInterval(interval);
      }
  }, [eventAddr, goshWallet, daoName, goshRoot, service?.locker, service?.proposal]);

    return (<>
    <Container
      className={"content-container-fullwidth"}
    >

      {!service?.proposal && <div className="no-data"><Loader style={{stroke: "#007BFF !important"}}/>Loading...</div>}
      {service?.proposal && <><div className="header-row" style={{paddingBottom: "24px"}}>
        <FlexContainer
          direction="row"
          justify="flex-start"
          align="center"
          
        >
          <Flex
            style={{marginRight: "16px"}}
          >
            <h2 className="color-faded no-margin">
                <Link to={`/organizations/${daoName}`} className="font-semibold text-xl hover:underline">
                    {daoName}
                </Link>
                {service?.proposal && <>
                <span className={"color-black"}> / </span>
                <span> {service.proposal.meta?.commit.repoName}</span>
                </>}
            </h2>
          </Flex>
          <Flex
            grow={1}
            style={{textAlign: "right", marginLeft: "auto"}}
          >
          </Flex>
        </FlexContainer>
      </div>
    
    {service?.proposal && monaco && (<div className="main-row">

      {goshWallet?.isDaoParticipant && (
        <FlexContainer
          className={cnb("smv-summary")}
          direction="row"
          justify="space-between"
          align="center"
        >
          <Flex
              grow={0}
              className={cnb("smv-summary-item")}
          >
              <span className={cnb("smv-summary-title")}>SMV balance:</span>
              {service.locker?.meta?.votesTotal !== undefined ? service.locker?.meta?.votesTotal : <LoaderDotsText />}
          </Flex>
          <Flex
              grow={0}
              className={cnb("smv-summary-item")}
          >
              <span className={cnb("smv-summary-title")}>Locked:</span>
              {service.locker?.meta?.votesLocked !== undefined ? service.locker?.meta?.votesLocked : <LoaderDotsText />}
          </Flex>
          <Flex
              grow={0}
              className={cnb("smv-summary-item")}
          >
              <span className={cnb("smv-summary-title")}>Wallet balance:</span>
              {service.balance !== undefined ? service.balance : <LoaderDotsText />}
          </Flex>
          <Flex 
              grow={1}
              className={cnb("smv-summary-item-status")}
              align="flex-end"
          >
              <StatusDot status={service.locker?.meta?.isBusy ? "error" : "success" }/>
          </Flex>
        </FlexContainer>
      )}
    </div>)}

    <div className={cnb("divider")}></div>


    {service?.proposal && monaco && (<FlexContainer
      className={cnb("event")}
      direction="column"
      justify="space-between"
      align="stretch"
    >
        
      <Flex>
        <div className={cnb("event-title")}>
          {service.commit?.meta?.content.title}
        </div>  

      </Flex>
      <Flex
        className={cnb("event-footer")}
      >
        <FlexContainer
          direction="row"
          justify="space-between"
          align="flex-start"
        >
          <Flex
            grow={1}
          >
            <div className={cnb("event-description")}>
              <FlexContainer
                justify="flex-start"
                align="center"
              >
                <Flex className={cnb("event-description-date")}>
                  {moment(service.proposal.meta?.time.start).format("MMMM Do YYYY")}
                  <div>{moment(service.proposal.meta?.time.start).format("h:mm a")}</div>
                </Flex>
                <Flex>
                  <span className="icon icon-arrow"><ArrowNarrowRightIcon/></span>
                </Flex>
                <Flex className={cnb("event-description-date")}>
                  {moment(service.proposal.meta?.time.finish).format("MMMM Do YYYY")}
                  <div>{moment(service.proposal.meta?.time.finish).format("h:mm a")}</div>
                </Flex>
                </FlexContainer>
              </div>
          </Flex>
        </FlexContainer>
      </Flex>
      <Flex>
        <FlexContainer
          direction="row"
          justify="justify-content"
          align="center"
          onClick={e => {
              e.stopPropagation();
              e.preventDefault();
          }}
        >
            <Flex
              grow={0}
              className={cnb("event-hashes")}
            >
              <CopyClipboard
                label={<>Proposal: <Typography>{shortString(service.proposal.meta?.id || '')}</Typography></>}
                componentProps={{
                    text: service.proposal.meta?.id || ''
                }}
              />
            </Flex>
            <Flex 
              grow={1}
              className={cnb("event-hashes")}
            >
              <CopyClipboard
                label={<>Commit: <Typography>{shortString(service.proposal.meta?.commit.commitName || '')}</Typography></>}
                componentProps={{
                    text: service.proposal.meta?.commit.commitName || ''
                }}
              />
          </Flex>

        </FlexContainer>
      </Flex>
      <Flex>


        {service?.proposal && monaco && (<>

          {service.proposal.meta?.isCompleted && (
            <div className={cnb("event-status", "event-status-success")}>
                Commit proposal
                <Link
                    className="mx-1 underline text-green-900"
                    to={`/${daoName}/${service.proposal.meta.commit.repoName}/commits/${service.proposal.meta.commit.branchName}/${service.proposal.meta.commit.commitName}`}
                >
                    {shortString(service.proposal.meta.commit.commitName)}
                </Link>
                was accepted by SMV
            </div>
          )}

          {!service.proposal.meta?.isCompleted && (<div className={cnb("event-status")}>

              <FlexContainer
                justify="space-between"
                align="flex-start"
              >
                  <Flex>
                    <h3 className="text-xl font-semibold">Vote for proposal</h3>
                  </Flex>
                  <Flex
                    grow={1}
                  >
                    &nbsp;
                  </Flex>
                  <Flex>
                    {service.proposal.meta?.isCompleted
                      ? <Typography className="color-success" style={{lineHeight: "1rem"}}>Completed</Typography>
                      : (<Typography className={"loader"} style={{lineHeight: "1rem"}}><Loader /> Running</Typography>)
                    }
                  </Flex>
              </FlexContainer>
              <FlexContainer
                justify="space-between"
                align="flex-start"
                >
                  <Flex
                    grow={1}
                  >
                    <FlexContainer
                      justify="flex-start"
                      align="center"
                    >
                        <Flex className="icon icon-thumb">
                          <ThumbUpIcon/>{service.proposal.meta?.votes.yes}
                        </Flex>
                        <Flex>
                          &nbsp;
                        </Flex>
                        <Flex className="icon icon-thumb">
                          <ThumbDownIcon/>{service.proposal.meta?.votes.no}
                        </Flex>
                        <Flex>                          
                          {goshWallet && goshWallet.isDaoParticipant && !service.proposal.meta?.isCompleted && (
                            <Button
                                type="button"
                                color="inherit"
                                variant="contained"
                                size="small"
                                className={cnb("button-recheck")}
                                onClick={() => service.proposal && onProposalCheck(service.proposal, goshWallet)}
                                disabled={check}
                            >
                                {check && <Loader className="mr-2" />}
                                Re-check
                            </Button>
                          )}
                        </Flex>
                    </FlexContainer>
                  </Flex>
                  <Flex>
                  </Flex>
                    {
                        goshWallet &&
                        goshWallet.isDaoParticipant &&
                        !!service.proposalLocked &&
                        service.proposal.meta?.isCompleted && (
                            <div>
                                <Button
                                  type="button"
                                  color="primary"
                                  variant="contained"
                                  size="small"
                                  className="btn btn--body text-sm px-4 py-1.5"
                                  onClick={onTokensRelease}
                                  disabled={release}
                                >
                                    {release && <Loader className="mr-2" />}
                                    Release
                                </Button>
                            </div>
                        )}
              </FlexContainer>


              <div className={cnb("event-status-footer")}>
                {goshWallet?.isDaoParticipant && !service.proposal.meta?.isCompleted && (
                    <Formik
                        initialValues={{
                            approve: 'true',
                            amount: (service.locker?.meta?.votesTotal ?? 0) - (service.locker?.meta?.votesLocked ?? 0)
                        }}
                        onSubmit={onProposalSubmit}
                        validationSchema={Yup.object().shape({
                            amount: Yup.number()
                                .min(1, 'Should be a number >= 1')
                                .max((service.locker?.meta?.votesTotal ?? 0) - (service.locker?.meta?.votesLocked ?? 0))
                                .required('Field is required')
                        })}
                        enableReinitialize
                    >
                        {({ isSubmitting, values, handleChange }) => (
                          <Form>
                            <FlexContainer
                              justify="flex-start"
                              align="center"
                            >
                                <Flex
                                  className={cnb("smv-form-field")}
                                >
                                    <InputBase
                                        name="amount"
                                        value={values.amount}
                                        onChange={handleChange}
                                        className={cnb("input-field","amount-input")}
                                        placeholder='Amount of tokens'
                                        autoComplete='off'
                                    />
                                </Flex>
                                <Flex
                                  className={cnb("smv-form-field")}
                                >
                                    <label
                                      className={cnb("smv-form-field-checkbox")}
                                    >
                                        <Field type="radio" name="approve" value={'true'} />
                                        <span className="ml-1">Accept</span>
                                    </label>
                                    <label
                                      className={cnb("smv-form-field-checkbox")}
                                    >
                                        <Field type="radio" name="approve" value={'false'} />
                                        <span className="ml-1">Reject</span>
                                    </label>
                                </Flex>
                                <Flex
                                  className={cnb("smv-form-field")}
                                >
                                <Button
                                  type="submit"
                                  color="primary"
                                  variant="contained"
                                  size="large"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting && <Loader/>}
                                    Vote for proposal
                                </Button>
                              </Flex>
                            </FlexContainer>
                          </Form>
                        )}
                    </Formik>
                )}</div>
              </div>)}

              <h3 className="mt-10 mb-4 text-xl font-semibold">Proposal diff</h3>
              {service.blobs?.map((item, index) => {
                  const language = getCodeLanguageFromFilename(monaco, item.name);
                  return (
                      <div key={index} className="my-5 border rounded overflow-hidden">
                          <div className="bg-gray-100 border-b px-3 py-1.5 text-sm font-semibold">
                              {item.name}
                          </div>
                          <div className={cnb("text-editor-wrapper", "text-editor-wrapper-preview")}>
                                <BlobDiffPreview
                                  className={cnb("text-editor")}
                                  original={item.prevContent}
                                  modified={item.currContent}
                                  modifiedLanguage={language}
                                />
                              </div>
                      </div>
                  );
              })}
        </>)}
  
      </Flex>
    </FlexContainer>)}

    <Flex grow={10000}>
      </Flex>
      </>}
  </Container>
  </>
    );
}

export default EventPage;

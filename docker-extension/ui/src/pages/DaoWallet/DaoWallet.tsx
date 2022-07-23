import React, { useEffect, useState } from "react";
import { Field, Form, Formik, FormikHelpers } from "formik";
import { useParams } from "react-router-dom";
import InputBase from '@mui/material/InputBase';
import { useGoshWallet } from "../../hooks/gosh.hooks";
import { GoshSmvLocker } from "../../types/classes";
import Button from '@mui/material/Button';

import { Loader, LoaderDotsText, FlexContainer, Flex, Modal } from "./../../components";
import * as Yup from "yup";

import styles from './DaoWallet.module.scss';
import classnames from "classnames/bind";

import { useOutletContext } from "react-router-dom";
import { IGoshSmvLocker, IGoshWallet } from "../../types/types";
import { useRecoilValue } from "recoil";
import { userStateAtom } from "../../store/user.state";
import CopyClipboard from "../../components/CopyClipboard";
import { TDaoLayoutOutletContext } from "../Dao";
import { EGoshError, GoshError } from "../../types/errors";
import { toast } from "react-toastify";



const cnb = classnames.bind(styles);

type TMoveBalanceFormValues = {
    amount: number;
}

const DaoWalletPage = () => {
  const userState = useRecoilValue(userStateAtom);
  const { goshWallet } = useOutletContext<TDaoLayoutOutletContext>();

  const [data, setData] = useState<{
      locker?: IGoshSmvLocker;
      balance?: number;
      smvBalance?: number;
      smvLocked?: number;
  }>();

  const gitRemoteCredentials = {
      "my-wallet": {
          "address": goshWallet?.address,
          "keys": {
              "public": userState.keys?.public,
              "secret": userState.keys?.secret
          }
      }
  }

  const onMoveBalanceToSmvBalance = async (values: TMoveBalanceFormValues) => {
      console.debug('[Move balance to SMV balance] - Values:', values);
      try {
          if (!goshWallet) throw new GoshError(EGoshError.NO_WALLET);

          await goshWallet.lockVoting(values.amount);
          toast.success('Submitted. Balances will be updated soon');
      } catch (e: any) {
          console.error(e.message);
          toast.error(e.message);
      }
  }

  const onMoveSmvBalanceToBalance = async (values: TMoveBalanceFormValues) => {
      console.debug('[Move SMV balance to balance] - Values:', values);
      try {
          if (!goshWallet) throw new GoshError(EGoshError.NO_WALLET);

          await goshWallet.unlockVoting(values.amount);
          toast.success('Submitted. Balances will be updated soon');
      } catch (e: any) {
          console.error(e.message);
          toast.error(e.message);
      }
  }

  const onReleaseSmvTokens = async () => {
      try {
          if (!goshWallet) throw new GoshError(EGoshError.NO_WALLET);

          await goshWallet.updateHead();
          toast.success('Release submitted. Available tokens will be released soon');
      } catch (e: any) {
          console.error(e.message);
          toast.error(e.message);
      }
  }

  useEffect(() => {
      const getWalletData = async (wallet: IGoshWallet) => {
          const balance = await wallet.getSmvTokenBalance();
          const lockerAddr = await wallet.getSmvLockerAddr();
          const locker = new GoshSmvLocker(wallet.account.client, lockerAddr);
          await locker.load();
          setData({
              locker,
              balance,
              smvBalance:
                  locker.meta?.votesTotal,
              smvLocked: locker.meta?.votesLocked
          });
      }

      if (goshWallet && !data?.locker) getWalletData(goshWallet);
      let interval: any;
      if (goshWallet && data?.locker) {
          interval = setInterval(async () => {
              const balance = await goshWallet.getSmvTokenBalance();
              await data.locker?.load();
              setData((prev) => ({
                  ...prev,
                  balance,
                  smvBalance: data.locker?.meta?.votesTotal,
                  smvLocked: data.locker?.meta?.votesLocked
              }));
          }, 5000);
      }

      return () => {
          clearInterval(interval);
      }
  }, [goshWallet, data?.locker]);


    return (<>
        <div className="page-header">
          <FlexContainer
              direction="column"
              justify="space-between"
              align="stretch"
          >
            <Flex>
                <h2>Wallet</h2>
            </Flex>
            <Flex>
              <div>
                <FlexContainer
                    className={cnb("wallet-summary")}
                    direction="row"
                    justify="space-between"
                    align="center"
                >
                  <Flex
                      grow={0}
                      className={cnb("wallet-summary-item")}
                  >
                      <span className={cnb("wallet-summary-title")}>Wallet balance:</span>
                      {data?.balance !== undefined ? data?.balance : <LoaderDotsText />}
                  </Flex>
                  <Flex
                      grow={0}
                      className={cnb("wallet-summary-item")}
                  >
                      <span className={cnb("wallet-summary-title")}>SMV balance:</span>
                      {data?.smvBalance !== undefined ? data?.smvBalance : <LoaderDotsText />}
                  </Flex>
                  <Flex
                      grow={0}
                      className={cnb("wallet-summary-item")}
                  >
                      <span className={cnb("wallet-summary-title")}>Locked:</span>
                      {data?.smvLocked !== undefined ? data?.smvLocked : <LoaderDotsText />}
                  </Flex>

                  <Flex grow={1}></Flex>
                </FlexContainer>
              </div>
            </Flex>
          </FlexContainer>
        </div>
              <div className="divider"></div>


              {!goshWallet &&  <div className="loader">
                    <Loader />
                    Loading wallet...
                </div>}

            {goshWallet && <>

            <div className="divide-y divide-gray-200">
                <div className="py-5">
                    <p className="mb-3">
                        Move tokens from wallet balance to SMV balance to get an ability to create
                        new proposals and vote
                    </p>
                    <Formik
                        initialValues={{ amount: data?.balance || 0 }}
                        onSubmit={onMoveBalanceToSmvBalance}
                        validationSchema={Yup.object().shape({
                            amount: Yup
                                .number()
                                .min(1)
                                .max(data?.balance || 0)
                                .required('Field is required')
                        })}
                        enableReinitialize
                    >
                        {({ isSubmitting }) => (
                            <Form>
                            <FlexContainer
                                direction="row"
                                justify="flex-start"
                                align="center"
                                className={cnb("wallet-form")}
                            >
                              <Flex>
                                <Field
                                  name="amount"
                                  component={InputBase}
                                  inputProps={{
                                    className: 'input-field',
                                    type: "text",
                                    placeholder: 'Amount',
                                    autoComplete: 'off',
                                    disabled: isSubmitting
                                  }}
                                />
                              </Flex>
                              <Flex>
                                <Button
                                    color="primary"
                                    variant="contained"
                                    size="large"
                                    type="submit"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting && <Loader />}
                                    Move tokens to SMV balance
                                </Button>
                              </Flex>
                            </FlexContainer>
                            </Form>
                        )}
                    </Formik>
                </div>
              <div className="divider"></div>
                <div className="py-5">
                    <p className="mb-3">
                        Move tokens from SMV balance back to wallet balance
                    </p>
                    <Formik
                        initialValues={{ amount: data?.smvBalance || 0 }}
                        onSubmit={onMoveSmvBalanceToBalance}
                        validationSchema={Yup.object().shape({
                            amount: Yup
                                .number()
                                .min(1)
                                .max(data?.smvBalance || 0)
                                .required('Field is required')
                        })}
                        enableReinitialize
                    >
                        {({ isSubmitting }) => (
                            <Form>
                            <FlexContainer
                                direction="row"
                                justify="flex-start"
                                align="center"
                                className={cnb("wallet-form")}
                            >
                              <Flex>
                                    <Field
                                        name="amount"
                                        component={InputBase}
                                        inputProps={{
                                          className: 'input-field',
                                          type: "text",
                                          placeholder: 'Amount',
                                          autoComplete: 'off',
                                          disabled: isSubmitting
                                        }}
                                    />
                                    </Flex>
                                    <Flex>
                                <Button
                                    color="primary"
                                    variant="contained"
                                    size="large"
                                    type="submit"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting && <Loader />}
                                    Move tokens to wallet balance
                                </Button>
                                    </Flex>
                                </FlexContainer>
                            </Form>
                        )}
                    </Formik>
                </div>
              <div className="divider"></div>
                <div className="py-5">
                    <p className="mb-3">
                        Release locked tokens from all completed proposals back to SMV balance
                    </p>
                    <Formik
                        initialValues={{}}
                        onSubmit={onReleaseSmvTokens}
                        enableReinitialize
                    >
                        {({ isSubmitting }) => (
                            <Form>
                            <Button
                                color="primary"
                                variant="contained"
                                size="large"
                                type="submit"
                                disabled={isSubmitting || !data?.smvLocked}
                            >
                                {isSubmitting && <Loader />}
                                Release locked tokens
                            </Button>
                            </Form>
                        )}
                    </Formik>
                </div>
              <div className="divider"></div>
                <h4>Git remote</h4>
                <div className="mb-3">
                    Git remote credentials
                </div>
                {goshWallet.isDaoParticipant
                    ? (
                        <div className={cnb("git-remote")}>
                            <CopyClipboard
                                className={cnb("git-remote-copy")}
                                componentProps={{ text: JSON.stringify(gitRemoteCredentials) }}
                            />
                            <pre>
                              <code>
                                {JSON.stringify(gitRemoteCredentials, undefined, 2)}
                              </code>
                            </pre>
                        </div>
                    )
                    : <p className="text-sm text-rose-400">You are not a DAO participant</p>
                }
            </div></>}
        </>
    );
}

export default DaoWalletPage;

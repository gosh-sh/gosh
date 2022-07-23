import React, { useCallback, useEffect, useState } from "react";
import { Field, FieldArray, Form, Formik, FormikHelpers } from "formik";
import { useRecoilValue } from "recoil";
import CopyClipboard from "../../components/CopyClipboard";

import Button from '@mui/material/Button';
import InputBase from '@mui/material/InputBase';
import { userStateAtom } from "../../store/user.state";
import { GoshWallet } from "../../types/classes";
import { shortString } from "../../utils";
import * as Yup from "yup";
import { useOutletContext } from "react-router-dom";
import { TDaoLayoutOutletContext } from "../Dao";
import { Loader, LoaderDotsText, FlexContainer, Flex, Modal } from "./../../components";
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';

import styles from './DaoParticipants.module.scss';
import classnames from "classnames/bind";
import { Typography } from "@mui/material";

const cnb = classnames.bind(styles);

type TParticipantFormValues = {
    pubkey: string[];
}

const DaoParticipantsPage = () => {
    const userState = useRecoilValue(userStateAtom);
    const { goshDao } = useOutletContext<TDaoLayoutOutletContext>();
    const [participants, setParticipants] = useState<{ pubkey: string; smvBalance: number; }[]>();

    const getParticipantList = useCallback(async () => {
        // Get GoshWallet code by user's pubkey and get all user's wallets
        const walletAddrs = await goshDao.getWallets();
        console.debug('GoshWallets addreses:', walletAddrs);

        const participants = await Promise.all(
            walletAddrs.map(async (addr) => {
                const wallet = new GoshWallet(goshDao.account.client, addr);
                const pubkey = await wallet.getPubkey();
                const smvBalance = await wallet.getSmvTokenBalance();
                return { pubkey, smvBalance };
            })
        );
        setParticipants(participants);
    }, [goshDao]);

    const onCreateParticipant = async (
        values: TParticipantFormValues,
        helpers: FormikHelpers<any>
    ) => {
        try {
            if (!userState.keys) throw Error('Empty user state');

            console.debug('[DAO participants] - Create values:', values);
            await Promise.all(values.pubkey.map(async (item) => {
                if (!userState.keys) throw Error('Empty user state');

                console.debug('[DAO participants] - DAO address:', goshDao.address);
                const rootPubkey = await goshDao.getRootPubkey();
                console.debug('[DAO participants] - Create root/item/keys:', rootPubkey, item, userState.keys);
                const walletAddr = await goshDao.deployWallet(rootPubkey, item, userState.keys);
                console.debug('[DAO participants] - Create wallet addr:', walletAddr);
            }));

            getParticipantList();
            helpers.resetForm();
        } catch (e: any) {
            console.error(e.message);
            alert(e.message);
        }
    }

    useEffect(() => {
        getParticipantList();
    }, [getParticipantList]);

    return (<>
        <div className="page-header">
          <FlexContainer
              direction="column"
              justify="space-between"
              align="stretch"
          >
            <Flex>
                <h2>Participants</h2>
                <div className="divider"></div>
            </Flex>
            <Flex>
                {participants === undefined && (
                    <div className={cnb("loader", "loader-participants")}>
                        <Loader />
                        Loading {"participants"}...
                    </div>
                )}

                {Boolean(participants) && <>
                  
                <div className="divide-y divide-gray-c4c4c4">
                    {participants?.map(({ pubkey, smvBalance }, index) => (
                      <FlexContainer
                        className={cnb("participant")}
                        key={index}
                        direction="row"
                        justify="space-between"
                        align="center"
                      >
                        <Flex>
                          <CopyClipboard
                            componentProps={{ text: pubkey }}

                            className={cnb("participant-pubkey")}
                            label={<Typography>{shortString(pubkey, 10, 10)}</Typography>}
                          />
                        </Flex>
                        <Flex className={cnb("participant-balance")}>
                            Token balance:
                            <span>{smvBalance}</span>
                        </Flex>
                      </FlexContainer>

                    ))}
                </div>
            <Formik
                initialValues={{ pubkey: [] }}
                onSubmit={onCreateParticipant}
                validateOnBlur
                validationSchema={Yup.object().shape({
                    pubkey: Yup.array().of(Yup.string().required('Participant public key is reqired. Delete cell or fill it with key.'))
                })}
            >
                {({ isSubmitting, values, touched, errors, handleChange }) => (
                    <Form className="mt-8">
                        <FieldArray
                            name="pubkey"
                            render={({ push, remove }) => (
                                <>
                                {console.log(values)}
                                    {values.pubkey.map((item, index) => (
                                      <FlexContainer
                                        className={cnb("participant", "participant-new")}
                                        key={index}
                                        direction="row"
                                        justify="space-between"
                                        align="center"
                                      >
                                        <Flex
                                          grow={1}
                                        >
                                          {/* <Field
                                              name={`pubkey.${index}`}
                                              component={InputBase}
                                              className={cnb("participant-new-input")}
                                              inputProps={{
                                                  className: cnb("participant-new-input"),
                                                  placeholder: 'Participant public key',
                                                  autoComplete: 'off',
                                                  disabled: isSubmitting                                                        
                                              }}
                                          /> */}
                                          <InputBase
                                              name={`pubkey.${index}`}
                                              onChange={handleChange}
                                              className={cnb("participant-new-input")}
                                              placeholder={'Participant public key'}
                                              autoComplete={'off'}
                                              disabled={isSubmitting}
                                          />
                                          </Flex>
                                          <Flex
                                            grow={0}
                                          >
                                            <IconButton
                                                edge="start"
                                                color="inherit"
                                                onClick={() => remove(index)}
                                                aria-label="close"
                                                className={cnb("close")}
                                                disabled={isSubmitting}
                                            >
                                                <CloseIcon />
                                            </IconButton>
                                          </Flex>
                                        </FlexContainer>
                                      ))}

                                      <Button
                                          className={cnb("add-participant")}
                                          type="button"
                                          size="large"
                                          onClick={() => push('')}
                                          disabled={isSubmitting}
                                      >
                                          Add participant <CloseIcon />
                                      </Button>

                                    {touched.pubkey && errors.pubkey && (
                                        <Typography
                                          className="text-red-dd3a3a text-sm mt-1"
                                          style={{marginBottom: "1rem"}}
                                        >
                                            {errors.pubkey[0]}
                                        </Typography>
                                    )}
                                </>
                            )}
                        />

                        <Button
                          color="primary"
                          type="submit"
                          className={cnb("button-cta", "button-submit")}
                          variant="contained"
                          size="large"
                          disableElevation
                          disabled={isSubmitting || !values.pubkey.length}
                          >
                              
                          {isSubmitting && <Loader className={cnb({"loader-active": isSubmitting})} />}
                          Save changes
                        </Button>

                    </Form>
                )}
            </Formik>

                </>}
            </Flex>
        </FlexContainer>
        </div>

        </>
    );
}

export default DaoParticipantsPage;

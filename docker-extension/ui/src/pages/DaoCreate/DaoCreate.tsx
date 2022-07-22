import React from "react";
import { Field, FieldArray, Form, Formik } from "formik";
import * as Yup from "yup";
import { useGoshRoot } from "./../../hooks/gosh.hooks";
import { useNavigate } from "react-router-dom";
import { useRecoilValue } from "recoil";
import { userStateAtom } from "./../../store/user.state";
import { Loader, Modal, FlexContainer, Flex } from "./../../components";
import { GoshDao } from "./../../types/classes";
import { fromEvers } from "./../../utils";
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import CloseIcon from '@mui/icons-material/Close';

import styles from './DaoCreate.module.scss';
import classnames from "classnames/bind";
import { Typography } from "@mui/material";

const cnb = classnames.bind(styles);


type TFormValues = {
    name: string;
    participants: string[];
}

const DaoCreatePage = () => {
    const goshRoot = useGoshRoot();
    const navigate = useNavigate();
    const userState = useRecoilValue(userStateAtom);

    const onDaoCreate = async (values: TFormValues) => {
        try {
            if (!userState.keys) throw Error('Empty user state');
            if (!goshRoot?.account.client) throw Error('Client is not ready');

            // Deploy GoshDao
            const rootPubkey = `0x${userState.keys.public}`;
            const daoAddr = await goshRoot?.deployDao(values.name, rootPubkey);
            console.debug('DAO address:', daoAddr);
            const dao = new GoshDao(goshRoot.account.client, daoAddr);

            // Topup GoshDao and deploy wallets
            await goshRoot.daoCreator.sendMoneyDao(
                values.name,
                fromEvers(2 * values.participants.length)
            );
            await Promise.all(values.participants.map(async (item) => {
                const walletAddr = await dao.deployWallet(rootPubkey, item);
                console.debug('DAOWallet address:', walletAddr);
            }));

            navigate('/account/organizations');
        } catch (e: any) {
            console.error(e.message);
            alert(e.message);
        }
    }

    return (
        <Modal
          show={true}
          wide={true}
          onHide={() => {
            navigate('/account/organizations');
          }}
        >

        <div className="modal-wide">
        <h2 className="drag-up">Create new organization</h2>

                <Formik
                    initialValues={{
                        name: '',
                        participants: [
                            userState.keys ? `0x${userState.keys.public}` : ''
                        ]
                    }}
                    onSubmit={onDaoCreate}
                    validationSchema={Yup.object().shape({
                        name: Yup.string().required('Name is required'),
                        participants: Yup.array().of(Yup.string().required('Required'))
                    })}
                >
                    {({ values, touched, handleChange, errors, isSubmitting }) => (
                        <Form>
                            <div>
                                <InputBase
                                    name="name"
                                    className="input-field input-field-modal"
                                    type="text"
                                    placeholder="New organization name"
                                    autoComplete={'off'}
                                    value={values.name}
                                    onChange={handleChange}
                                    error={touched && touched.name && Boolean(errors.name)}
                                />
                                {errors.name && (
                                    <Typography className="error-block color-error">
                                        Enter organization's name.
                                    </Typography>
                                )}
                            </div>
<>
</>
                            <div className={cnb("participants")}>
                                <h4>Participants</h4>
                                <FieldArray
                                    name="participants"
                                    // className={cnb("participants-list)}
                                    render={({ push, remove }) => (
                                        <>
                                            {values.participants.map((item, index) => (
                                                <FlexContainer
                                                    direction="row"
                                                    justify="space-between"
                                                    align="center"
                                                    key={index}
                                                    className={cnb("participants-list-item")}
                                                >
                                                    <Flex 
                                                        grow={1}
                                                    >
                                                        <InputBase
                                                            name={`participants.${index}`}
                                                            className="input-field input-field-modal"
                                                            type="text"
                                                            placeholder="Participant public key"
                                                            disabled={index === 0}
                                                            value={values.participants[index]}
                                                            onChange={handleChange}
                                                            error={touched && touched.participants && Boolean(errors.participants)}
                                                        />
                                                    </Flex>

                                                    <Flex 
                                                        grow={0}
                                                        className={cnb("remove-button")}
                                                    >
                                                        <IconButton
                                                            edge="start"
                                                            color="inherit"
                                                            onClick={() => remove(index)}
                                                            aria-label="close"
                                                            className={cnb("close")}
                                                            disabled={index <= 0 }
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
                                            >
                                                Add participant <CloseIcon />
                                            </Button>

                                            {touched.participants && errors.participants && (
                                                <Typography className="color-error">
                                                    There are empty participants. Either fill them or remove.
                                                </Typography>
                                            )}
                                        </>
                                    )}
                                />
                            </div>

                            <Button
                                color="primary"
                                className={cnb("button-cta", "button-submit")}
                                variant="contained"
                                size="large"
                                type="submit"
                                disabled={isSubmitting}
                            >
                                {isSubmitting && <Loader className={cnb({"loader-active": isSubmitting})} />}
                                Create organization
                            </Button>
                        </Form>
                    )}
                </Formik>
        </div>
        </Modal>
    );
}

export default DaoCreatePage;

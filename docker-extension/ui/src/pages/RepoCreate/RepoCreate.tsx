import React from "react";
import { Field, Form, Formik } from "formik";
import * as Yup from "yup";
import { useGoshWallet } from "./../../hooks/gosh.hooks";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import { Loader, Modal } from "./../../components";
import { TDaoLayoutOutletContext } from "./../DaoLayout";
import InputBase from '@mui/material/InputBase';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

import styles from './RepoCreate.module.scss';
import classnames from "classnames/bind";

const cnb = classnames.bind(styles);


type TFormValues = {
    name: string;
}

const RepoCreatePage = () => {
    const { daoName } = useParams();
    const goshWallet = useGoshWallet(daoName);
    const navigate = useNavigate();
    const { goshDao } = useOutletContext<TDaoLayoutOutletContext>();

    console.log(goshWallet);

    const onRepoCreate = async (values: TFormValues) => {
        try {
            await goshWallet?.deployRepo(values.name);
            navigate(`/organizations/${daoName}/repositories/${values.name}`, { replace: true });
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
            navigate(`/organizations/${goshDao.meta?.name}`);
          }}
        >
        <div className="modal-wide">
        <h2 className="drag-up">New repository</h2>

                <Formik
                    initialValues={{ name: '' }}
                    onSubmit={onRepoCreate}
                    validationSchema={Yup.object().shape({
                        name: Yup.string().required('Name is required')
                    })}
                >
                    {({ isSubmitting, values, errors, touched, handleChange }) => (
                        <Form>
                        <div>
                            <InputBase
                                name="name"
                                className="input-field input-field-modal"
                                type="text"
                                placeholder="Repository name"
                                autoComplete={'off'}
                                value={values.name}
                                onChange={handleChange}
                                error={touched && touched.name && Boolean(errors.name)}
                            />
                            {errors.name && (
                                <Typography className="error-block color-error">
                                    Enter repository's name.
                                </Typography>
                            )}
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
                                Create repository
                            </Button>
                        </Form>
                    )}
                </Formik>
            </div>
    </Modal>
    );
}

export default RepoCreatePage;

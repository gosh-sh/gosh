import React from "react";
import { Form, Formik, Field, ErrorMessage, FormikHelpers } from "formik";
import * as Yup from "yup";
import { useEverClient } from "./../../hooks/ever.hooks";
import { useSetRecoilState } from "recoil";
import { userStateAtom } from "./../../store/user.state";
import { useNavigate } from "react-router-dom";
import { Loader } from "./../../components";
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography';
import TextareaAutosize from '@mui/material/TextareaAutosize';

type TFormValues = {
    phrase: string;
}

export const SigninPage = () => {
    const navigate = useNavigate();
    const everClient = useEverClient();
    const setUserState = useSetRecoilState(userStateAtom);

    const onFormSubmit = async (values: TFormValues, helpers: FormikHelpers<TFormValues>) => {

        const result = await everClient.crypto.mnemonic_verify({ phrase: values.phrase });
        if (!result.valid) {
            helpers.setFieldError('phrase', 'Phrase is invalid');
            return;
        }

        const keys = await everClient.crypto.mnemonic_derive_sign_keys({
            phrase: values.phrase
        });
        setUserState({ phrase: values.phrase, keys });
        navigate('/account/organizations', { replace: true });
    }

    return (
        <div className="block-auth">
            <h2 className="modal-title">
                Sign in to Gosh
            </h2>
            <Typography className="modal-description">
                Please, write your seed phrase
            </Typography>

            <Formik
                initialValues={{ phrase: '' }}
                onSubmit={onFormSubmit}
                validationSchema={Yup.object().shape({
                    phrase: Yup.string().required('Phrase is required')
                })}
            >
                {({ values, handleChange, isSubmitting, touched, errors }) => (
                    <Form className="modal-form">
                        <div>
                            <TextareaAutosize
                                name="phrase"
                                className={"seedphrase-textarea"}
                                value={values.phrase}
                                onChange={handleChange}
                                aria-label="minimum height"
                                minRows={6}
                                placeholder="GOSH root seed phrase"
                                style={{ width: 200 }}
                            />
                        </div>

                        <div className="mt-10 text-red-dd3a3a text-center text-base h-6">
                            {touched.phrase && errors.phrase && (<ErrorMessage name={'phrase'} />)}
                        </div>

                        <div className="mt-2">
                            <Button
                                color="primary"
                                className="button-cta"
                                variant="contained"
                                size="large"
                                type="submit"
                                disabled={isSubmitting}
                            >
                                {isSubmitting && <Loader />}
                                Sign in
                            </Button>
                        </div>
                    </Form>
                )}
            </Formik>
        </div>
    );
}

export default SigninPage;

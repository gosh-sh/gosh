import React, { useState } from "react";
import { Form, Formik, Field, ErrorMessage, FormikHelpers } from "formik";
import * as Yup from "yup";
import { useEverClient } from "./../../hooks/ever.hooks";
import { useResetRecoilState, useSetRecoilState } from "recoil";
import { appModalStateAtom } from "../../store/app.state";
import { useNavigate } from "react-router-dom";
import { Loader, PinCode, Slider, SlideSwitcher } from "./../../components";
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography';
import TextareaAutosize from '@mui/material/TextareaAutosize';
import { userStatePersistAtom } from "../../store/user.state";

import { Swiper } from 'swiper/types';

type TFormValues = {
    phrase: string;
}

export const SigninPage = () => {
    const navigate = useNavigate();
    const userStatePersistReset = useResetRecoilState(userStatePersistAtom);
    const everClient = useEverClient();
    const [slider, setSlider] = useState<Swiper>();
    const setModal = useSetRecoilState(appModalStateAtom);

    const onFormSubmit = async (values: TFormValues, helpers: FormikHelpers<TFormValues>) => {
        userStatePersistReset();
        const result = await everClient.crypto.mnemonic_verify({ phrase: values.phrase });
        if (!result.valid) {
            helpers.setFieldError('phrase', 'Phrase is invalid');
            return;
        } else {
            slider?.slideNext()
        }
    }

    return (
        <div className="block-auth">
            <h2 className="modal-title">
                Sign in to Gosh
            </h2>
            <Formik
                initialValues={{ phrase: ""}}
                onSubmit={onFormSubmit}
                validationSchema={Yup.object().shape({
                    phrase: Yup.string().required('Phrase is required').matches(/^(?:\s*[^\d\W]+(?:\s+[^\d\W]+){11})?\s*$/, "Doesn't look like a valid seed phrase")
                })}
            >
                {({ values, handleChange, isSubmitting, touched, errors }) => (
                    <Form className="modal-form">

                    <Slider
                        direction={"horizontal"}
                        spaceBetween={16}
                        allowTouchMove={false}
                        onSwiper={(swiper) => setSlider(swiper)}
                    >
                        <>
                            <Typography className="modal-description">
                                Please, write your seed phrase
                            </Typography>

                                
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
                                {errors.phrase && (<ErrorMessage name={'phrase'} />)}
                            </div>

                            {/* <SlideSwitcher
                                direction="next"
                            >    */}
                                <Button
                                    color="primary"
                                    className="button-cta"
                                    variant="contained"
                                    size="large"
                                    type="submit"
                                    disabled={!Boolean(!errors.phrase && values.phrase)}
                                >
                                    {isSubmitting && <Loader />}
                                    Next
                                </Button>
                            {/* </SlideSwitcher> */}
                        </>
                        <>
                            <PinCode
                                phrase={values.phrase}
                                onUnlock={() => navigate('/account/organizations', { replace: true })}
                            />
                        </>
                        </Slider>
                    </Form>
                )}
            </Formik>
        </div>
    );
}

export default SigninPage;

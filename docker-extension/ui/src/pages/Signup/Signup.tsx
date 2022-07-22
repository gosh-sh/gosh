import React, { useEffect, useState } from "react";
import { Form, Formik, Field } from "formik";
import * as Yup from "yup";
import { useEverClient } from "./../../hooks/ever.hooks";
import { useSetRecoilState } from "recoil";
import { userStateAtom } from "./../../store/user.state";
import { useNavigate } from "react-router-dom";
import { Loader } from "./../../components";
import { TonClient } from "@eversdk/core";

import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography';
import TextareaAutosize from '@mui/material/TextareaAutosize';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';


type TFormValues = {
    phrase: string;
    isConfirmed: boolean;
}

export const SignupPage = () => {
    const navigate = useNavigate();
    const everClient = useEverClient();
    const setUserState = useSetRecoilState(userStateAtom);
    const [phrase, setPhrase] = useState<string>('');

    const generatePhrase = async (client: TonClient) => {
        const result = await client.crypto.mnemonic_from_random({});
        setPhrase(result.phrase);
    }

    const onFormSubmit = async (values: TFormValues) => {
        const keys = await everClient.crypto.mnemonic_derive_sign_keys({
            phrase: values.phrase
        });
        setUserState({ phrase: values.phrase, keys });
        navigate('/account/organizations', { replace: true });
    }

    useEffect(() => {
        console.debug('[Signup] - Generate phrase');
        generatePhrase(everClient);
    }, [everClient]);

    const label = { inputProps: { 'aria-label': 'I have written phrase carefuly' } };

    return (
        <div className="block-auth">
            <h2 className="modal-title">
            Create Gosh account
            </h2>
            <Typography className="modal-description">
            It's your seed phrase, please write it on paper
            </Typography>

            <Formik
                initialValues={{ phrase, isConfirmed: false }}
                onSubmit={onFormSubmit}
                validationSchema={Yup.object().shape({
                    phrase: Yup.string().required('`Phrase` is required'),
                    isConfirmed: Yup.boolean().oneOf([true], 'You should accept this')
                })}
                enableReinitialize={true}
            >
                {({ values, handleChange, isSubmitting }) => (
                    <Form className="px-5 sm:px-124px">
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

                        <div className="form-checkbox">

                        <FormControlLabel
                            control={<Checkbox
                                disabled={!values.phrase}
                                {...label}
                                name="isConfirmed"
                                onChange={handleChange}
                                icon={<RadioButtonUncheckedIcon />}
                                checkedIcon={<RadioButtonCheckedIcon />}
                            />}
                            label="I have written phrase carefuly"
                        />
                        </div>

                        <div className="mt-6">
                            <Button
                                color="primary"
                                className="button-cta"
                                variant="contained"
                                size="large"
                                type="submit"
                                disabled={isSubmitting || !values.isConfirmed}
                            >
                                <Loader className={isSubmitting ? "loader-active" : ""}/>
                                Create account
                            </Button>
                        </div>
                    </Form>
                )}
            </Formik>
        </div>
    );
}

export default SignupPage;

import React, { useCallback, useEffect, useState } from "react";
import { Dialog } from "@headlessui/react";
import { useRecoilState, useResetRecoilState, useSetRecoilState } from "recoil";
import { userStateAtom, userStatePersistAtom } from "../../store/user.state";
import { SHA256 } from "crypto-js";
import { Buffer } from "buffer";
import { chacha20, generateRandomBytes } from "../../utils/helpers";
import { useEverClient } from "../../hooks/ever.hooks";
import { appModalStateAtom } from "../../store/app.state";
import { TUserStatePersist } from "../../types/types";
import Typography from '@mui/material/Typography';
import InputBase from '@mui/material/InputBase';
import styles from "./Modal.module.scss";
import classnames from "classnames/bind";
import Button from '@mui/material/Button';
import { ContactSupportOutlined } from "@mui/icons-material";
import { Flex, FlexContainer } from "../Flex";
import { useFormikContext } from "formik";

const cnb = classnames.bind(styles);

type TPinCodeProps = {
    unlock?: boolean;
    phrase?: string;

    onUnlock?(): void;
}

export const PinCode = (props: TPinCodeProps) => {
    const { phrase, unlock, onUnlock } = props;

    const everClient = useEverClient();
    const [userStatePersist, setUserStatePersist] = useRecoilState(userStatePersistAtom);
    const setUserState = useSetRecoilState(userStateAtom);
    const setModal = useSetRecoilState(appModalStateAtom);
    const resetUserStatePersist = useResetRecoilState(userStatePersistAtom);
    const resetUserState = useResetRecoilState(userStateAtom);
    const resetModal = useResetRecoilState(appModalStateAtom);
    const [prompt, setPrompt] = useState<string>('');
    const [pin, setPin] = useState<string>('');
    const [tmp, setTmp] = useState<TUserStatePersist>({ ...userStatePersist });

    const onPinSubmit = useCallback(async (pin: string) => {
        const pinHash = SHA256(pin).toString();
        const pinKey = Number(pin).toString(16);

        if (phrase) {
            const nonce = await generateRandomBytes(everClient, 12, true);
            const encrypted = await chacha20.encrypt(
                everClient,
                Buffer.from(phrase).toString('base64'),
                pinKey,
                nonce
            );
            setTmp({ nonce, phrase: encrypted, pin: pinHash });
            setPin('');
        }

        if (tmp.phrase && tmp.nonce) {
            if (pinHash !== tmp.pin) {
                setPrompt("Codes did not match");
                setTimeout(() => {
                    setPrompt("");
                }, 3000);
                setPin('');
                if (!unlock) setTmp({ phrase: undefined, nonce: undefined, pin: undefined });
                return;
            }

            let decrypted = await chacha20.decrypt(everClient, tmp.phrase, pinKey, tmp.nonce);
            decrypted = Buffer.from(decrypted, 'base64').toString();
            const keys = await everClient.crypto.mnemonic_derive_sign_keys({ phrase: decrypted });

            setUserStatePersist(tmp);
            setUserState({ ...tmp, phrase: decrypted, keys });
            setModal({ isOpen: false, element: null });
            onUnlock && onUnlock();
        }
    }, [everClient, phrase, unlock, tmp, onUnlock, setModal, setUserState, setUserStatePersist]);

    useEffect(() => {
        if (pin.length === 4) onPinSubmit(pin);

    }, [pin, onPinSubmit]);

    return (
        <FlexContainer
            justify="center"
            align="center"
            direction="column"
            className={cnb("pin-wrapper")}
        >
            <Flex
                grow={1}
                align={"stretch"}
            >

            <Typography className="modal-description modal-description-center align-center">
                {tmp.pin ? 'Unlock with PIN code' : 'Create PIN code'}
            </Typography>

            <div className={cnb("pin-field-wrapper")}>
            <InputBase
                type="text"
                className={cnb("input-field", "input-field-pin", "pin-field")}
                placeholder=""
                inputProps={{ pattern: "[0-9]{0,4}", maxLength: 4  }}
                value={pin}

                onChange={(e) => setPin((v) => {
                    if (e.target.value.length === 4) setTimeout(() => e.target.blur(), 200);
                    return (e.target.validity.valid ? e.target.value : v)
                })}
                // )}
            />
            
            <Typography className={cnb("pin-prompt")}>
                {prompt}
            </Typography>
            </div>
            </Flex>

            {unlock && (
            <Flex>
                <Button
                    color="inherit"
                    size="large"
                    className={cnb("button-cta", "button-cta-pale", "button-sign-out")}
                    disableElevation
                    onClick={() => {
                        resetUserState();
                        resetUserStatePersist();
                        resetModal();
                    }}
                    >Sign out</Button>
                    </Flex>
            )}
        </FlexContainer>
    );
}

export default PinCode;

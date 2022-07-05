import React from "react";
import { useRecoilValue } from "recoil";
import CopyClipboard from "../../components/CopyClipboard";
import { userStateAtom } from "../../store/user.state";
import { shortString } from "../../utils";


const SettingsPage = () => {
    const userState = useRecoilValue(userStateAtom);

    return (
        <div>
            <h3 className="text-xl font-semibold">My public key</h3>
            <p>Share it with DAO owner to add you to participants list</p>
            {userState.keys && (
                <CopyClipboard
                    className="mt-4"
                    label={shortString(`0x${userState.keys.public}`, 10, 10)}
                    componentProps={{
                        text: `0x${userState.keys.public}`
                    }}
                />
            )}
        </div>
    );
}

export default SettingsPage;

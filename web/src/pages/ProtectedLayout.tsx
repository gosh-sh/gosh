import React, { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSetRecoilState, useRecoilValue } from "recoil";
import PinCodeModal from "../components/Modal/PinCode";
import { appModalStateAtom } from "../store/app.state";
import { userStateAtom, userStatePersistAtom } from "../store/user.state";


type TProtectedLayoutProps = {
    redirect?: boolean;
}

const ProtectedLayout = (props: TProtectedLayoutProps) => {
    const { redirect = true } = props;

    const userStatePersist = useRecoilValue(userStatePersistAtom);
    const userState = useRecoilValue(userStateAtom);
    const setModal = useSetRecoilState(appModalStateAtom);

    useEffect(() => {
        if (userStatePersist.pin && !userState.phrase) setModal({
            static: true,
            isOpen: true,
            element: <PinCodeModal unlock={true} />
        });
    }, [userStatePersist.pin, userState.phrase, setModal]);

    if (!userStatePersist.pin && redirect) return <Navigate to="/" />
    return <Outlet />
}

export default ProtectedLayout;

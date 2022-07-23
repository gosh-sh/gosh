import React, { ReactNode, useEffect } from "react";
import { Navigate, useNavigate, Outlet } from "react-router-dom";
import { useSetRecoilState, useRecoilValue } from "recoil";
import PinCode from "../components/Modal/PinCode";
import { appModalStateAtom } from "../store/app.state";
import { userStateAtom, userStatePersistAtom } from "../store/user.state";
import { Modal } from "../components";

import cn from "classnames/bind";

const UnlockModal = ({showModal, handleClose, children}: {
    showModal: boolean,
    handleClose: any,
    children: ReactNode,
  }) => {
    return (
      <Modal
        show={showModal}
        onHide={handleClose}
        className={cn("")}
      >
        {children}
      </Modal>
    )
  };

type TProtectedLayoutProps = {
    redirect?: boolean;
}
  
const ProtectedLayout = (props: TProtectedLayoutProps) => {
    const { redirect = true } = props;
    const userStatePersist = useRecoilValue(userStatePersistAtom);
    const userState = useRecoilValue(userStateAtom);
    const setModal = useSetRecoilState(appModalStateAtom);
    const modal = useRecoilValue(appModalStateAtom);
    const navigate = useNavigate();

    useEffect(() => {
        if (userStatePersist.pin && !userState.phrase) setModal({
            static: true,
            isOpen: true,
            element: <></>
        });
    }, [userStatePersist.pin, userState.phrase, setModal]);

    if (!userStatePersist.pin && redirect) return <Navigate to="/" />

    return <>
        <UnlockModal
           showModal={modal.isOpen} 
           handleClose={() => navigate("/")} 
        ><PinCode
            unlock={true}
            onUnlock={() => navigate("/account/organizations")}
        /></UnlockModal>
        <Outlet />
    </>
}

export default ProtectedLayout;



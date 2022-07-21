import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSetRecoilState, useRecoilValue } from 'recoil';
import PinCodeModal from '../components/Modal/PinCode';
import { appModalStateAtom } from 'web-common/lib/store/app.state';
import { userStateAtom, userStatePersistAtom } from 'web-common/lib/store/user.state';
import { TUserState, TUserStatePersist } from 'web-common/lib/types/types';

type TProtectedLayoutProps = {
    redirect?: boolean;
};

const ProtectedLayout = (props: TProtectedLayoutProps) => {
    const { redirect = true } = props;

    const userStatePersist = useRecoilValue<TUserStatePersist>(userStatePersistAtom);
    const userState = useRecoilValue<TUserState>(userStateAtom);
    const setModal = useSetRecoilState(appModalStateAtom);

    useEffect(() => {
        if (userStatePersist.pin && !userState.phrase)
            setModal({
                static: true,
                isOpen: true,
                element: <PinCodeModal unlock={true} />,
            });
    }, [userStatePersist.pin, userState.phrase, setModal]);

    if (!userStatePersist.pin && redirect) return <Navigate to="/" />;
    return <Outlet />;
};

export default ProtectedLayout;

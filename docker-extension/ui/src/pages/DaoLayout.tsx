
import { Outlet, useParams } from "react-router-dom";
import { useGoshDao } from "./../hooks/gosh.hooks";
import { IGoshDao } from "./../types/types";


import Container from '@mui/material/Container';

const DaoLayout = () => {
    const { daoName } = useParams();
    const goshDao = useGoshDao(daoName);

    return (
        <Outlet context={{ goshDao }} />
    );
}

export default DaoLayout;

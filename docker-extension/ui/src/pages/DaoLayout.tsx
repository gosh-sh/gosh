
import { Outlet, useParams } from "react-router-dom";
import { useGoshDao } from "./../hooks/gosh.hooks";
import { IGoshDao } from "./../types/types";


import Container from '@mui/material/Container';


export type TDaoLayoutOutletContext = {
    goshDao: IGoshDao;
}

const DaoLayout = () => {
    const { daoName } = useParams();
    const goshDao = useGoshDao(daoName);

    return (
        <Container
            className={"content-container"}
        >
            <Outlet context={{ goshDao }} />
      </Container>
    );
}

export default DaoLayout;

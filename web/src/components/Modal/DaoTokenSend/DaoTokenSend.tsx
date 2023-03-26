import { TDao } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import DAO_TOKEN_SEND_MODAL_2_0_0 from './2.0.0/DaoTokenSend'
import DAO_TOKEN_SEND_MODAL_3_0_0 from './3.0.0/DaoTokenSend'

type TDaoTokenSendModalProps = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
}

const DaoTokenSendModal = (props: TDaoTokenSendModalProps) => {
    const { dao } = props
    const version = dao.details.version

    if (version === '2.0.0') {
        return <DAO_TOKEN_SEND_MODAL_2_0_0 dao={dao} />
    }
    return <DAO_TOKEN_SEND_MODAL_3_0_0 dao={dao} />
}

export default DaoTokenSendModal

import { TDao, TSmvDetails } from 'react-gosh'
import { IGoshDaoAdapter, IGoshSmvAdapter } from 'react-gosh/dist/gosh/interfaces'
import WALLET_TOKEN_SEND_MODAL_2_0_0 from './2.0.0/WalletTokenSend'
import WALLET_TOKEN_SEND_MODAL_3_0_0 from './3.0.0/WalletTokenSend'

type TWalletTokenSendModalProps = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
    wallet: {
        adapter?: IGoshSmvAdapter
        details: TSmvDetails
    }
}

const WalletTokenSendModal = (props: TWalletTokenSendModalProps) => {
    const { dao } = props
    const version = dao.details.version

    if (version === '2.0.0') {
        return <WALLET_TOKEN_SEND_MODAL_2_0_0 {...props} />
    }
    return <WALLET_TOKEN_SEND_MODAL_3_0_0 {...props} />
}

export default WalletTokenSendModal

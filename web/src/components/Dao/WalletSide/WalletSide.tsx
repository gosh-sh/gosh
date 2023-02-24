import { TDao, TSmvDetails } from 'react-gosh'
import { IGoshDaoAdapter, IGoshSmvAdapter } from 'react-gosh/dist/gosh/interfaces'
import DAO_WALLET_SIDE_1_0_0 from './1.0.0/WalletSide'
import DAO_WALLET_SIDE_2_0_0 from './2.0.0/WalletSide'

type TDaoWalletSideProps = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
    wallet: {
        adapter?: IGoshSmvAdapter
        details: TSmvDetails
    }
    className?: string
}

const DaoWalletSide = (props: TDaoWalletSideProps) => {
    const { dao, wallet, className } = props
    const version = dao.details.version

    if (version === '1.0.0') {
        return <DAO_WALLET_SIDE_1_0_0 wallet={wallet} className={className} />
    }
    return <DAO_WALLET_SIDE_2_0_0 dao={dao} wallet={wallet} className={className} />
}

export { DaoWalletSide }

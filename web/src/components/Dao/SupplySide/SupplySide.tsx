import { TDao } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import DAO_SUPPLY_SIDE_1_0_0 from './1.0.0/SupplySide'
import DAO_SUPPLY_SIDE_2_0_0 from './2.0.0/SupplySide'

type TDaoSupplySideProps = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
    className?: string
}

const DaoSupplySide = (props: TDaoSupplySideProps) => {
    const { dao, className } = props
    const version = dao.details.version

    if (version === '1.0.0') {
        return <DAO_SUPPLY_SIDE_1_0_0 dao={dao} className={className} />
    }
    return <DAO_SUPPLY_SIDE_2_0_0 dao={dao} className={className} />
}

export { DaoSupplySide }

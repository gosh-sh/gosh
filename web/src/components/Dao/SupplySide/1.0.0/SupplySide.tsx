import { classNames, TDao } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'

type TDaoSupplySideProps = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
    className?: string
}

const DaoSupplySide = (props: TDaoSupplySideProps) => {
    const { dao, className } = props

    return (
        <div
            className={classNames('border border-gray-e6edff rounded-xl p-5', className)}
        >
            <div>
                <div className="mb-1 text-gray-7c8db5 text-sm">DAO total supply</div>
                <div className="text-3xl font-medium">{dao.details.supply.total}</div>
            </div>
        </div>
    )
}

export default DaoSupplySide

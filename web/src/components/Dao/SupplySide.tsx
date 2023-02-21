import { TDao } from 'react-gosh'

type TDaoSupplySideProps = {
    details: TDao
}

const DaoSupplySide = (props: TDaoSupplySideProps) => {
    const { details } = props

    return (
        <div className="border border-gray-e6edff rounded-xl p-5">
            <div className="mb-4 text-gray-7c8db5 text-sm">Total supply</div>
            <div className="text-3xl font-medium">{details.supply.total}</div>
        </div>
    )
}

export { DaoSupplySide }

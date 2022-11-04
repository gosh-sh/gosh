import { TGoshEventDetails } from 'react-gosh'

type TDaoUpgradeEventProps = {
    daoName?: string
    details: TGoshEventDetails
}

const DaoUpgradeEvent = (props: TDaoUpgradeEventProps) => {
    const { daoName, details } = props
    const { params, status } = details

    return (
        <div>
            {status.completed && status.accepted && (
                <div className="bg-green-700 text-white mt-6 px-4 py-3 rounded">
                    <p>DAO upgrade proposal was accepted by SMV</p>
                </div>
            )}

            <h4 className="mt-10 mb-3 text-lg font-semibold">Event details</h4>
            <div>
                <div className="font-semibold">
                    Upgrade DAO to version {params.newversion}
                </div>
                <div className="text-sm text-gray-606060">{params.description}</div>
            </div>
        </div>
    )
}

export default DaoUpgradeEvent

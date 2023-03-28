import { Dialog } from '@headlessui/react'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { executeByChunk, MAX_PARALLEL_READ, TDao } from 'react-gosh'
import { useResetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../store/app.state'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { useEffect, useState } from 'react'

type TDaoMemberOfModalProps = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
}

const DaoMemberOfModal = (props: TDaoMemberOfModalProps) => {
    const { dao } = props
    const resetModal = useResetRecoilState(appModalStateAtom)
    const [daos, setDaos] = useState<
        { name: string; balance: number; allowance: number }[]
    >([])

    useEffect(() => {
        const _getDetails = async () => {
            const gosh = dao.adapter.getGosh()
            const items = await executeByChunk(
                dao.details.isMemberOf,
                MAX_PARALLEL_READ,
                async (item) => {
                    const dao = await gosh.getDao({ address: item.dao, useAuth: false })
                    const wallet = await dao.getMemberWallet({ address: item.wallet })
                    const smv = await dao.getSmv()
                    const balance = await smv.getDetails(wallet)
                    return {
                        name: await dao.getName(),
                        balance: balance.smvBalance + balance.smvAvailable,
                        allowance: balance.allowance,
                    }
                },
            )
            setDaos(items)
        }

        _getDetails()
    }, [dao.adapter, dao.details.isMemberOf])

    return (
        <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-2xl">
            <div className="absolute right-2 top-2">
                <button className="px-3 py-2 text-gray-7c8db5" onClick={resetModal}>
                    <FontAwesomeIcon icon={faTimes} size="lg" />
                </button>
            </div>
            <Dialog.Title className="mb-8 text-3xl text-center font-medium">
                Wallet's Owner
            </Dialog.Title>

            <div className="border border-gray-e6edff rounded-xl">
                <div className="flex flex-wrap text-gray-53596d text-xs py-4 px-2">
                    <div className="w-6/12 px-2">Organization name</div>
                    <div className="w-3/12 px-2">DAO token</div>
                    <div className="w-3/12 px-2">Karma</div>
                </div>
                <div className="divide-y divide-gray-e6edff">
                    {daos.map(({ name, balance, allowance }, index) => (
                        <div className="flex flex-wrap px-2 py-4" key={index}>
                            <div className="w-6/12 px-2">{name}</div>
                            <div className="w-3/12 px-2">{balance.toLocaleString()}</div>
                            <div className="w-3/12 px-2">
                                {allowance.toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Dialog.Panel>
    )
}

export default DaoMemberOfModal

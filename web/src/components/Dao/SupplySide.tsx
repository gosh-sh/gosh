import { classNames, TDao } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { useSetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../store/app.state'
import { Button } from '../Form'
import DaoTokenMintModal from '../Modal/DaoTokenMint'
import DaoTokenSendModal from '../Modal/DaoTokenSend'

type TDaoSupplySideProps = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
    className?: string
}

const DaoSupplySide = (props: TDaoSupplySideProps) => {
    const { dao, className } = props
    const setModal = useSetRecoilState(appModalStateAtom)

    const onDaoTokenSendClick = () => {
        setModal({
            static: false,
            isOpen: true,
            element: <DaoTokenSendModal dao={dao} />,
        })
    }

    const onDaoMintClick = () => {
        setModal({
            static: false,
            isOpen: true,
            element: <DaoTokenMintModal dao={dao} />,
        })
    }

    return (
        <div
            className={classNames('border border-gray-e6edff rounded-xl p-5', className)}
        >
            <div>
                <div className="mb-1 text-gray-7c8db5 text-sm">DAO total supply</div>
                <div className="text-3xl font-medium">{dao.details.supply.total}</div>
            </div>
            <hr className="my-4 bg-gray-e6edff" />
            <div>
                <div className="mb-1 text-gray-7c8db5 text-sm">DAO reserve</div>
                <div className="text-xl font-medium">{dao.details.supply.reserve}</div>
            </div>
            {dao.details.isAuthMember && (
                <div className="mt-3 flex flex-wrap gap-x-3">
                    <div className="grow">
                        <Button
                            className={classNames(
                                'w-full !border-gray-e6edff bg-gray-fafafd',
                                'hover:!border-gray-53596d',
                            )}
                            variant="custom"
                            onClick={onDaoTokenSendClick}
                        >
                            Send
                        </Button>
                    </div>
                    {dao.details.isMintOn && (
                        <div className="grow">
                            <Button
                                className={classNames(
                                    'w-full !border-gray-e6edff bg-gray-fafafd',
                                    'hover:!border-gray-53596d',
                                )}
                                variant="custom"
                                onClick={onDaoMintClick}
                            >
                                Mint
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export { DaoSupplySide }

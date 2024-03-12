import { Dialog } from '@headlessui/react'
import classNames from 'classnames'
import { useOutletContext } from 'react-router-dom'
import { useSetRecoilState } from 'recoil'
import { Button } from '../../../components/Form'
import { ModalCloseButton } from '../../../components/Modal'
import { TRepoLayoutOutletContext } from '../../../pages/RepoLayout'
import { appModalStateAtom } from '../../../store/app.state'
import { fromBigint } from '../../../utils'
import { useRepoTokenWallet } from '../../hooks/repository.hooks'
import { SendRepoTokens } from './SendTokens'

const RepoTokenWallet = () => {
  const { dao, repository } = useOutletContext<TRepoLayoutOutletContext>()
  const setModal = useSetRecoilState(appModalStateAtom)
  const token_wallet = useRepoTokenWallet({
    initialize: true,
    subscribe: true,
    _rm: {
      dao_details: dao.details,
      repo_name: repository.details.name,
      repo_adapter: repository.adapter,
    },
  })

  const openSendTokensForm = () => {
    setModal({
      isOpen: true,
      element: (
        <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-sm overflow-clip">
          <ModalCloseButton />
          <SendRepoTokens
            repo_addr={repository.details.address}
            _rm={{
              dao_details: dao.details,
              repo_name: repository.details.name,
              repo_adapter: repository.adapter,
            }}
            onSubmit={() => setModal((state) => ({ ...state, isOpen: false }))}
          />
        </Dialog.Panel>
      ),
    })
  }

  return (
    <>
      <div className="flex flex-col divide-y divide-dashed divide-gray-e6edff">
        <div className="flex py-1 items-center">
          <div className="flex-1 text-sm text-gray-53596d font-light">Name</div>
          <div className="flex-1">{token_wallet?.token.name}</div>
        </div>
        <div className="flex py-1 items-center">
          <div className="flex-1 text-sm text-gray-53596d font-light">Symbol</div>
          <div className="flex-1">{token_wallet?.token.symbol}</div>
        </div>
        <div className="flex py-1 items-center">
          <div className="flex-1 text-sm text-gray-53596d font-light">Decimals</div>
          <div className="flex-1">{token_wallet?.token.decimals}</div>
        </div>
        <div className="flex py-1 items-center">
          <div className="flex-1 text-sm text-gray-53596d font-light">Balance</div>
          <div className="flex-1">
            {(token_wallet ? fromBigint(token_wallet.balance, 18) : 0).toLocaleString()}
          </div>
        </div>
      </div>

      <div className={classNames('mt-6', !token_wallet?.wallet ? 'hidden' : null)}>
        <Button
          className="w-full"
          disabled={token_wallet?.balance === BigInt(0)}
          onClick={openSendTokensForm}
        >
          Send
        </Button>
      </div>
    </>
  )
}

export { RepoTokenWallet }

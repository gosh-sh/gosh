import { AnimatePresence, motion } from 'framer-motion'
import { useL2Transfer } from '../../hooks/l2.hooks'
import { CompleteStep, TransferStep, RouteStep, Breadcrumbs } from './components'
import { fromBigint, shortString, roundNumber } from '../../../utils'
import { useEffect } from 'react'
import Alert from '../../../components/Alert'
import CopyClipboard from '../../../components/CopyClipboard'
import { useErrorBoundary, withErrorBoundary } from 'react-error-boundary'
import { TL2Token } from '../../types/l2.types'
import { Button } from '../../../components/Form'
import { L2Web3Chains } from '../../../constants'
import Summary from './components/Summary'
import Withdrawals from './components/Withdrawals'

const motionProps = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.25 },
}

const L2PageInner = () => {
  const { showBoundary } = useErrorBoundary()
  const { web3, gosh, step, withdrawals, error, connectWeb3 } = useL2Transfer({
    initialize: true,
  })

  const getNetworkBalance = (token: TL2Token, balance: bigint) => {
    const floatstr = fromBigint(balance, token.decimals)
    return roundNumber(floatstr, 5)
  }

  useEffect(() => {
    if (error) {
      showBoundary(error)
    }
  }, [error])

  return (
    <div className="flex flex-wrap xl:flex-nowrap items-start justify-center gap-16">
      <div className="grow">
        <h1 className="text-3xl font-medium mb-4">Cross-chain transfer</h1>

        <Alert variant="warning" className="mb-6">
          <h3 className="font-medium">
            GOSH Ethereum L2 <span className="text-red-ff3b30">Alpha</span> Testing
          </h3>
          <div>
            The contract has not been formally verified yet. Please do not send a lot!
          </div>
        </Alert>

        <div className="my-10">
          <Breadcrumbs />
        </div>

        {!web3.chain_supported && (
          <Alert variant="danger" className="mb-6">
            <h3 className="font-medium">Incorrect Web3 chain: {web3.chain_id}</h3>
            <div>GOSH Ethereum L2 supports Ethereum main net for now</div>
          </Alert>
        )}

        <AnimatePresence mode="wait">
          {step === 'route' && (
            <motion.div key="route" {...motionProps}>
              <RouteStep />
            </motion.div>
          )}
          {step === 'transfer' && (
            <motion.div key="transfer" {...motionProps}>
              <TransferStep />
            </motion.div>
          )}
          {step === 'complete' && (
            <motion.div key="complete" {...motionProps}>
              <CompleteStep />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="basis-full xl:basis-4/12 shrink-0">
        <div className="border border-gray-e6edff rounded-xl p-5">
          <h3 className="text-xl font-medium">Accounts</h3>

          <div className="mt-6 flex flex-col gap-y-5">
            <div className="flex items-center justify-between gap-x-6">
              <div className="grow flex flex-nowrap items-center gap-x-3">
                <img
                  src={L2Web3Chains[web3.chain_id].iconpath}
                  className="w-8"
                  alt="Blockchain"
                />
                <div>
                  {L2Web3Chains[web3.chain_id].name || 'Connect wallet'}
                  {web3.instance && (
                    <CopyClipboard
                      className="text-xs text-gray-7c8db5"
                      label={shortString(web3.address)}
                      componentProps={{ text: web3.address }}
                    />
                  )}
                </div>
              </div>
              <div className="font-medium">
                {web3.token ? (
                  <>
                    {getNetworkBalance(web3.token, web3.balance)}{' '}
                    <span className="text-gray-7c8db5 font-light text-sm">
                      {web3.token.symbol}
                    </span>
                  </>
                ) : (
                  <Button type="button" size="sm" onClick={connectWeb3}>
                    Connect
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-x-6">
              <div className="grow flex flex-nowrap items-center gap-x-3">
                <img src="/images/tokens/gosh.webp" className="w-8" alt="Blockchain" />
                <div>
                  GOSH
                  {gosh.address && (
                    <CopyClipboard
                      className="text-xs text-gray-7c8db5"
                      label={shortString(gosh.address)}
                      componentProps={{ text: gosh.address }}
                    />
                  )}
                </div>
              </div>
              {gosh.token && (
                <div className="font-medium">
                  {getNetworkBalance(gosh.token, gosh.balance)}{' '}
                  <span className="text-gray-7c8db5 font-light text-sm">
                    {gosh.token.symbol}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {!!withdrawals.length && web3.instance && (
          <div className="mt-6 border border-gray-e6edff rounded-xl p-5">
            <Withdrawals />
          </div>
        )}

        <div className="mt-6 border border-gray-e6edff rounded-xl p-5">
          <Summary />
        </div>
      </div>
    </div>
  )
}

const L2Page = withErrorBoundary(L2PageInner, {
  fallbackRender: ({ error }) => (
    <Alert variant="danger">
      <h3 className="font-medium">Ethereum L2 error</h3>
      <div>{error.message}</div>
    </Alert>
  ),
})

export default L2Page

import { Button } from '../../../../../components/Form'
import { useL2Transfer } from '../../../../hooks/l2.hooks'
import { EL2Network } from '../../../../types/l2.types'
import RouteGoshToEth from './RouteGoshToEth'
import RouteEthToGosh from './RouteEthToGosh'
import RouteGoshToGosh from './RouteGoshToGosh'

const TransferStep = () => {
  const { summary, setStep } = useL2Transfer()

  const isBackDisabled = () => {
    const any_processing = summary.progress.steps.some(
      (item) => item.status === 'pending',
    )
    const any_completed = summary.progress.steps.some(
      (item) => item.status === 'completed',
    )
    return any_processing || any_completed
  }

  const onBackClick = () => {
    setStep('route')
  }

  return (
    <div>
      <div
        className="flex flex-col border border-gray-e6edff rounded-xl
                bg-gray-fafafd py-8 lg:py-11 px-5 lg:px-8 mb-5 gap-y-8"
      >
        {summary.progress.route === `${EL2Network.GOSH}:${EL2Network.ETH}` && (
          <RouteGoshToEth />
        )}
        {summary.progress.route === `${EL2Network.ETH}:${EL2Network.GOSH}` && (
          <RouteEthToGosh />
        )}
        {summary.progress.route === `${EL2Network.GOSH}:${EL2Network.GOSH}` && (
          <RouteGoshToGosh />
        )}
      </div>

      <div>
        <Button
          type="button"
          size="xl"
          variant="outline-secondary"
          disabled={isBackDisabled()}
          onClick={onBackClick}
        >
          Back
        </Button>
      </div>
    </div>
  )
}

export { TransferStep }

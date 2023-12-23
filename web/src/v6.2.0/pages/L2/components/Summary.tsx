import moment from 'moment'
import { useEffect, useState } from 'react'
import CopyClipboard from '../../../../components/CopyClipboard'
import { fromBigint, getDurationDelta, shortString } from '../../../../utils'
import { useL2Transfer } from '../../../hooks/l2.hooks'
import { l2Tokens } from '../../../store/l2.state'
import { EL2Network, TL2Token } from '../../../types/l2.types'

const getPayoutTime = () => {
  const hours = [0, 3, 6, 9, 12, 15, 18, 21]
  const moments = hours.map((h) => moment.utc({ hour: h, minute: 0, second: 0 }))
  moments.push(moment.utc({ day: moment.utc().date() + 1, hour: 0, second: 0 }))

  const now = moment()
  const diffs = moments.map((m) => m.diff(now, 'seconds'))
  const index = diffs.findIndex((diff) => diff > 0)
  return moments[index]
}

const Summary = () => {
  const { comissions, summary, reset } = useL2Transfer()

  const [payout, setPayout] = useState<any>(getPayoutTime())
  const [commission, setCommission] = useState<{ token: TL2Token; value: bigint }>()
  const route = `${summary.from?.token.network}:${summary.to?.token.network}`

  useEffect(() => {
    let commission_token = summary.to.token
    if (route.indexOf(`:${EL2Network.ETH}`) >= 0) {
      commission_token = l2Tokens.find((item) => (item.pair_name = 'eth'))!
    }
    setCommission({ token: commission_token, value: comissions[route] })
  }, [comissions[route], summary.to.token.pair_name])

  useEffect(() => {
    const interval = setInterval(() => setPayout(getPayoutTime()), 1000)
    return () => {
      clearInterval(interval)
      reset()
    }
  }, [])

  return (
    <>
      <h3 className="text-xl font-medium">Summary</h3>

      <div className="mt-6">
        <h4 className="text-gray-7c8db5 text-sm mb-1">Send</h4>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <div className="grow flex flex-nowrap items-center gap-x-3">
            <img src={summary.from.token.iconpath} className="w-8" alt="Blockchain" />
            <div>
              {summary.from.token.name}{' '}
              <span className="text-xs text-gray-7c8db5 uppercase">
                {summary.from.token.network}
              </span>
              <CopyClipboard
                className="text-xs text-gray-7c8db5"
                label={shortString(summary.from.wallet)}
                componentProps={{ text: summary.from.wallet }}
              />
            </div>
          </div>
          <div className="text-sm font-medium whitespace-nowrap">
            {summary.from.amount.toLocaleString()}{' '}
            <span className="text-gray-7c8db5 font-light text-sm">
              {summary.from.token.symbol}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-gray-7c8db5 text-sm mb-1">Receive</h4>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <div className="grow flex flex-nowrap items-center gap-x-3">
            <img src={summary.to.token.iconpath} className="w-8" alt="Blockchain" />
            <div>
              {summary.to.token.name}{' '}
              <span className="text-xs text-gray-7c8db5 uppercase">
                {summary.to.token.network}
              </span>
              <CopyClipboard
                className="text-xs text-gray-7c8db5"
                label={shortString(summary.to.wallet)}
                componentProps={{ text: summary.to.wallet }}
              />
            </div>
          </div>
          <div className="text-sm font-medium whitespace-nowrap">
            {summary.to.amount.toLocaleString()}{' '}
            <span className="text-gray-7c8db5 font-light text-sm">
              {summary.to.token.symbol}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-t-gray-e6edff">
        {commission && (
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
            <div className="grow text-sm">Estimate commission</div>
            <div className="text-sm font-medium whitespace-nowrap">
              {fromBigint(commission.value, commission.token.decimals)}{' '}
              <span className="text-gray-7c8db5 font-light text-sm">
                {commission.token.symbol}
              </span>
            </div>
          </div>
        )}

        {route === `${EL2Network.GOSH}:${EL2Network.ETH}` && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
            <div className="grow text-sm">Next payout</div>
            <div className="text-sm font-medium font-mono whitespace-nowrap">
              {getDurationDelta(payout, '[h:h] [m:m] [s:s]')}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default Summary

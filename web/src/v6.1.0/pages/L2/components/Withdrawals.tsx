import { Form, Formik } from 'formik'
import { Button } from '../../../../components/Form'
import { fromBigint, roundNumber } from '../../../../utils'
import { useL2Transfer } from '../../../hooks/l2.hooks'
import { TL2Withdrawal } from '../../../types/l2.types'

const Withdrawals = () => {
  const { web3, withdrawals, withdrawErc20 } = useL2Transfer()
  const pending = withdrawals.filter((item) => item.commission > 0n)

  const getAmount = (item: TL2Withdrawal) => {
    const floatstr = fromBigint(item.value, item.token.decimals)
    return roundNumber(floatstr, 5)
  }

  const onWithdrawErc20 = async (values: { rootaddr: string }) => {
    try {
      await withdrawErc20({
        rootaddr: values.rootaddr,
        walletaddr: web3.address,
        alone: true,
      })
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <>
      <h3 className="text-xl font-medium">Your pending withdrawals</h3>

      <div className="mt-6 flex flex-col gap-y-5">
        {!pending.length && (
          <p className="text-sm text-center text-gray-7c8db5">
            You have no pending withdrawals
          </p>
        )}

        {pending.map((item, index) => (
          <div key={index} className="grow flex flex-nowrap items-center gap-x-3">
            <div className="flex flex-nowrap items-center gap-x-2">
              <img src={item.token.iconpath} className="w-6" alt="Blockchain" />
              <span className="text-sm">{item.token.symbol}</span>
            </div>
            <div className="grow text-end">{getAmount(item)}</div>
            <div>
              <Formik
                initialValues={{ rootaddr: item.token.rootaddr! }}
                onSubmit={onWithdrawErc20}
              >
                {({ isSubmitting }) => (
                  <Form>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSubmitting}
                      isLoading={isSubmitting}
                    >
                      Withdraw
                    </Button>
                  </Form>
                )}
              </Formik>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default Withdrawals

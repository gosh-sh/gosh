import { Button } from '../../../../components/Form'
import { useBridgeTransfer } from '../../../hooks/bridge.hooks'

const CompleteStep = () => {
    const { reset } = useBridgeTransfer()

    return (
        <div className="border border-gray-e6edff rounded-xl bg-gray-fafafd px-5 py-16">
            <div className="w-[8.75rem] mx-auto">
                <img src="/images/success-green.webp" alt="Success" />
            </div>

            <h1 className="mt-10 text-xl font-medium text-center">Transfer completed</h1>
            <div className="mt-1 text-sm text-gray-7c8db5 text-center">
                Please check receive wallet
            </div>

            <div className="mt-6 text-center">
                <Button size="xl" onClick={reset}>
                    End
                </Button>
            </div>
        </div>
    )
}

export { CompleteStep }

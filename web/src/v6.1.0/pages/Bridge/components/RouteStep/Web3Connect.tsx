import { Button } from '../../../../../components/Form'
import { useBridgeTransfer } from '../../../../hooks/bridge.hooks'
import { EBridgeNetwork } from '../../../../types/bridge.types'

type TWeb3ConnectProps = {
    network: string
}

const Web3Connect = (props: TWeb3ConnectProps) => {
    const { network } = props
    const { web3, connectWeb3 } = useBridgeTransfer()

    if (network === EBridgeNetwork.ETH && !web3.instance) {
        return (
            <div>
                <Button type="button" onClick={connectWeb3}>
                    Connect wallet
                </Button>
            </div>
        )
    }
}

export default Web3Connect

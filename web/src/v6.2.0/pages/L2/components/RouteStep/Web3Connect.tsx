import { Button } from '../../../../../components/Form'
import { useL2Transfer } from '../../../../hooks/l2.hooks'
import { EL2Network } from '../../../../types/l2.types'

type TWeb3ConnectProps = {
    network: string
}

const Web3Connect = (props: TWeb3ConnectProps) => {
    const { network } = props
    const { web3, connectWeb3 } = useL2Transfer()

    if (network === EL2Network.ETH && !web3.instance) {
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

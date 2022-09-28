import { TonClient, ClientConfig } from '@eversdk/core'
import { createDockerDesktopClient } from '@docker/extension-api-client'
import { GoshRoot, IGoshRoot } from './resources/contracts'

class AppConfig {
    static goshroot: IGoshRoot
    static goshclient: TonClient
    static ipfs: string
    static dockerclient?: any
    static versions = {
        '0.11.0': '0:.....................................................',
    }

    static setup(params: {
        goshclient: ClientConfig
        goshroot: string
        ipfs: string
        isDockerExt: boolean
    }) {
        const { goshclient, goshroot, ipfs, isDockerExt } = params
        if (!goshroot) throw Error('Gosh root address is undefined')
        if (!ipfs) throw Error('IPFS url is undefined')

        AppConfig.dockerclient = isDockerExt ? createDockerDesktopClient() : null
        AppConfig.goshclient = new TonClient(goshclient)
        AppConfig.goshroot = new GoshRoot(AppConfig.goshclient, goshroot)
        AppConfig.ipfs = ipfs
    }
}

export { AppConfig }

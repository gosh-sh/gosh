import { TonClient, ClientConfig } from '@eversdk/core'
import { createDockerDesktopClient } from '@docker/extension-api-client'
import { IGoshRoot } from './gosh/interfaces'
import { GoshRoot } from './gosh/goshroot'

class AppConfig {
    static goshroot: IGoshRoot
    static goshclient: TonClient
    static versions: { [ver: string]: string }
    static goshipfs: string
    static dockerclient?: any
    static db: any

    static setup(params: {
        goshclient: ClientConfig
        goshroot: string
        goshver: { [ver: string]: string }
        ipfs: string
        isDockerExt: boolean
        db: any
    }) {
        const { goshclient, goshroot, goshver, ipfs, isDockerExt, db } = params
        if (!goshroot) throw Error('Gosh version controller address is undefined')
        if (!Object.keys(goshver).length) throw Error('Gosh versions undefined')
        if (!ipfs) throw Error('IPFS url is undefined')

        AppConfig.dockerclient = isDockerExt ? createDockerDesktopClient() : null
        AppConfig.goshclient = new TonClient(goshclient)
        AppConfig.goshroot = new GoshRoot(AppConfig.goshclient, goshroot)
        AppConfig.versions = goshver
        AppConfig.goshipfs = ipfs
        AppConfig.db = db
    }
}

export { AppConfig }

import { TonClient, NetworkQueriesProtocol } from '@eversdk/core'
import { createDockerDesktopClient } from '@docker/extension-api-client'
import { GoshError } from './errors'
import { VersionController } from './blockchain/versioncontroller'
import { SupabaseClient, createClient } from '@supabase/supabase-js'
import { AppConfig as _AppConfig } from 'react-gosh'
import { DISABLED_VERSIONS } from './constants'
import { TIP3Root } from './blockchain/tip3root'

export class AppConfig {
    static endpoints: string[]
    static goshroot: VersionController
    static goshclient: TonClient
    static versions: { [ver: string]: string }
    static goshipfs: string
    static dockerclient?: any
    static supabase: SupabaseClient<any, 'public', any>
    static maintenance: number
    static tip3root: TIP3Root | null
    static elockaddr: string

    static setup() {
        const endpoints = import.meta.env.REACT_APP_GOSH_NETWORK?.split(',')
        if (!endpoints.length) {
            throw new GoshError('GOSH endpoints undefined')
        }

        const versions = JSON.parse(import.meta.env.REACT_APP_GOSH || '{}')
        if (!Object.keys(versions).length) {
            throw new GoshError('GOSH versions empty')
        }

        const goshRootAddress = import.meta.env.REACT_APP_GOSH_ROOTADDR
        if (!goshRootAddress) {
            throw new GoshError('GOSH version controller is undefined')
        }

        const ipfsUrl = import.meta.env.REACT_APP_IPFS
        if (!ipfsUrl) {
            throw new GoshError('IPFS url is undefined')
        }

        const tip3RootAddress = import.meta.env.REACT_APP_TIP3_ROOTADDR

        AppConfig.endpoints = endpoints
        AppConfig.goshclient = new TonClient({
            network: {
                endpoints,
                queries_protocol:
                    import.meta.env.REACT_APP_ISDOCKEREXT === 'true'
                        ? NetworkQueriesProtocol.HTTP
                        : NetworkQueriesProtocol.WS,
                sending_endpoint_count: endpoints.length,
            },
        })
        AppConfig.dockerclient =
            import.meta.env.REACT_APP_ISDOCKEREXT === 'true'
                ? createDockerDesktopClient()
                : null
        AppConfig.versions = versions
        AppConfig.goshroot = new VersionController(
            AppConfig.goshclient,
            goshRootAddress,
            versions,
        )
        AppConfig.goshipfs = ipfsUrl
        AppConfig.supabase = createClient(
            'https://auth.gosh.sh',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaHNrdnN6dGVwYnlpc2Jxc2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzA0MTMwNTEsImV4cCI6MTk4NTk4OTA1MX0._6KcFBYmSUfJqTJsKkWcMoIQBv3tuInic9hvEHuFpJg',
        )
        AppConfig.maintenance = parseInt(import.meta.env.REACT_APP_MAINTENANCE || '0')
        AppConfig.tip3root = tip3RootAddress
            ? new TIP3Root(AppConfig.goshclient, tip3RootAddress)
            : null
        AppConfig.elockaddr = import.meta.env.REACT_APP_ELOCKADDR

        // TODO: Remove this after git part refactor
        AppConfig._setupReactGosh()
    }

    static getVersions(options: { reverse?: boolean } = {}) {
        const { reverse } = options

        let active = Object.keys(AppConfig.versions).filter((v) => {
            return DISABLED_VERSIONS.indexOf(v) < 0
        })
        if (reverse) {
            active = active.reverse()
        }

        return Object.fromEntries(active.map((v) => [v, AppConfig.versions[v]]))
    }

    static getLatestVersion() {
        return Object.keys(AppConfig.versions)
            .reverse()
            .filter((v) => DISABLED_VERSIONS.indexOf(v) < 0)[0]
    }

    /**
     * TODO: Remove this after git part refactor
     */
    static _setupReactGosh() {
        const endpoints = import.meta.env.REACT_APP_GOSH_NETWORK?.split(',')
        const versions = JSON.parse(import.meta.env.REACT_APP_GOSH || '{}')
        const config = {
            goshclient: {
                network: {
                    endpoints,
                    queries_protocol:
                        import.meta.env.REACT_APP_ISDOCKEREXT === 'true'
                            ? NetworkQueriesProtocol.HTTP
                            : NetworkQueriesProtocol.WS,
                    sending_endpoint_count: endpoints?.length,
                },
            },
            goshroot: import.meta.env.REACT_APP_GOSH_ROOTADDR || '',
            goshver: versions,
            ipfs: import.meta.env.REACT_APP_IPFS || '',
            isDockerExt: import.meta.env.REACT_APP_ISDOCKEREXT === 'true',
        }
        _AppConfig.setup(config)
    }
}

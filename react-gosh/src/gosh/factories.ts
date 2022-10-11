import { AppConfig } from '../appconfig'
import { GoshError } from '../errors'
import { GoshAdapter_0_11_0 } from './0.11.0/adapter'
import { IGoshAdapter } from './interfaces'

class GoshAdapterFactory {
    static create(version: string): IGoshAdapter {
        const goshroot = AppConfig.goshroot
        const versions = AppConfig.versions
        switch (version) {
            case '0.11.0':
                return GoshAdapter_0_11_0.getInstance(goshroot, versions[version])
            default:
                throw new GoshError('GoshAdapter is not implemented', { version })
        }
    }

    static createLatest(): IGoshAdapter {
        const version = Object.keys(AppConfig.versions).reverse()[0]
        return GoshAdapterFactory.create(version)
    }
}

export { GoshAdapterFactory }

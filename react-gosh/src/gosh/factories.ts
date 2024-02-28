import { AppConfig } from '../appconfig'
import { GoshError } from '../errors'
import { GoshAdapter_1_0_0 } from './1.0.0/adapter'
import { GoshAdapter_2_0_0 } from './2.0.0/adapter'
import { GoshAdapter_3_0_0 } from './3.0.0/adapter'
import { GoshAdapter_4_0_0 } from './4.0.0/adapter'
import { GoshAdapter_5_0_0 } from './5.0.0/adapter'
import { GoshAdapter_5_1_0 } from './5.1.0/adapter'
import { GoshAdapter_6_0_0 } from './6.0.0/adapter'
import { GoshAdapter_6_1_0 } from './6.1.0/adapter'
import { GoshAdapter_6_2_0 } from './6.2.0/adapter'
import { GoshAdapter_6_3_0 } from './6.3.0/adapter'
import { IGoshAdapter } from './interfaces'

class GoshAdapterFactory {
    static create(version: string): IGoshAdapter {
        const goshroot = AppConfig.goshroot
        const versions = AppConfig.versions
        switch (version) {
            case '1.0.0':
                return GoshAdapter_1_0_0.getInstance(goshroot, versions[version])
            case '2.0.0':
                return GoshAdapter_2_0_0.getInstance(goshroot, versions[version])
            case '3.0.0':
                return GoshAdapter_3_0_0.getInstance(goshroot, versions[version])
            case '4.0.0':
                return GoshAdapter_4_0_0.getInstance(goshroot, versions[version])
            case '5.0.0':
                return GoshAdapter_5_0_0.getInstance(goshroot, versions[version])
            case '5.1.0':
                return GoshAdapter_5_1_0.getInstance(goshroot, versions[version])
            case '6.0.0':
                return GoshAdapter_6_0_0.getInstance(goshroot, versions[version])
            case '6.1.0':
                return GoshAdapter_6_1_0.getInstance(goshroot, versions[version])
            case '6.2.0':
                return GoshAdapter_6_2_0.getInstance(goshroot, versions[version])
            case '6.3.0':
                return GoshAdapter_6_3_0.getInstance(goshroot, versions[version])
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

import { AppConfig } from '../../appconfig'
import { BaseContract } from '../../blockchain/contract'
import { GoshError } from '../../errors'
import { contextVersion } from '../constants'
import { EDaoMemberType } from '../types/dao.types'
import { SystemContract } from './systemcontract'

export const getSystemContract = () => {
    const account = AppConfig.goshroot.getSystemContract(contextVersion)
    return account as SystemContract
}

export const getDaoOrProfile = async (address: string) => {
    const sc = getSystemContract()
    const account = new BaseContract(sc.client, sc.account.abi.value as object, address)

    try {
        const { type, version } = await account.getTypeVersion()
        if (type !== 'goshdao' || version !== (await sc.getVersion())) {
            throw new GoshError('Wrong contract', { address, type, version })
        }

        const dao = await sc.getDao({ address })
        return { type: EDaoMemberType.Dao, account: dao }
    } catch (e: any) {
        const profile = await AppConfig.goshroot.getUserProfile({ address })
        return { type: EDaoMemberType.User, account: profile }
    }
}

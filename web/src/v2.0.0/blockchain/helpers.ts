import { AppConfig } from '../../appconfig'
import { contextVersion } from '../constants'
import { SystemContract } from './systemcontract'

export const getSystemContract = () => {
  const account = AppConfig.goshroot.getSystemContract(contextVersion)
  return account as SystemContract
}

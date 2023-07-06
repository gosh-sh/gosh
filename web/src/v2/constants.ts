import { AppConfig } from '../appconfig'

export const contextVersion = '2.0.0'
export const systemContract = AppConfig.goshroot.getSystemContract(contextVersion)

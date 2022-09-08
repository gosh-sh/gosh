import { Account, AccountRunOptions } from '@eversdk/appkit'
import {
    KeyPair,
    ResultOfProcessMessage,
    signerKeys,
    signerNone,
    TonClient,
} from '@eversdk/core'
import { IContract } from './interfaces'
import ABI from './abi.json'

class BaseContract implements IContract {
    address: string
    account: Account
    version: string

    constructor(
        client: TonClient,
        key: string,
        address: string,
        options?: { version?: string; keys?: KeyPair },
    ) {
        const abi = options?.version ? (<any>ABI)[options.version][key] : (<any>ABI)[key]
        this.address = address
        this.account = new Account(
            { abi },
            {
                client,
                address,
                signer: options?.keys ? signerKeys(options.keys) : signerNone(),
            },
        )
        this.version = options?.version ?? ''
    }

    async run(
        functionName: string,
        input: object,
        options?: AccountRunOptions,
        writeLog: boolean = true,
    ): Promise<ResultOfProcessMessage> {
        if (writeLog) console.debug('[Run]', { functionName, input, options })
        const result = await this.account.run(functionName, input, options)
        if (writeLog) console.debug('[Run result]', { functionName, result })
        return result
    }
}

export { BaseContract }

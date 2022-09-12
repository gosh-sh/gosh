import { Account, AccountRunOptions, AccountType } from '@eversdk/appkit'
import {
    KeyPair,
    MessageBodyType,
    ResultOfProcessMessage,
    signerKeys,
    signerNone,
    TonClient,
} from '@eversdk/core'
import { IContract } from './interfaces'
import ABI from './abi.json'
import { sleep } from '../../utils'

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

    async isDeployed(): Promise<boolean> {
        const response = await this.account.client.net.query_collection({
            collection: 'accounts',
            filter: { id: { eq: this.address } },
            result: 'acc_type',
        })

        if (!response.result.length) return false
        return response.result[0].acc_type === AccountType.active
    }

    async getMessages(
        variables: {
            msgType: string[]
            node?: string[]
            cursor?: string | undefined
            limit?: number | undefined
        },
        decode?: boolean,
        all?: boolean,
        messages?: any[],
    ): Promise<any[]> {
        const { msgType, node = [], cursor, limit = 50 } = variables

        messages = messages ?? []
        all = all ?? false
        decode = decode ?? false

        const query = `query MessagesQuery(
            $address: String!,
            $msgType: [BlockchainMessageTypeFilterEnum!],
            $cursor: String,
            $limit: Int
        ) {
            blockchain {
                account(address: $address) {
                    messages(msg_type: $msgType, last: $limit, before: $cursor) {
                        edges {
                            node {
                                ${['id', 'msg_type', 'body', ...node].join(' ')}
                            }
                        }
                        pageInfo {
                            endCursor
                            hasPreviousPage
                        }
                    }
                }
            }
        }`
        const response = await this.account.client.net.query({
            query,
            variables: { address: this.address, msgType, limit, cursor: cursor || null },
        })
        const { edges, pageInfo } = response.result.data.blockchain.account.messages

        const page = edges.map((edge: any) => ({ message: edge.node, decoded: null }))
        if (decode) {
            await Promise.all(
                page.map(async (item: any) => {
                    try {
                        item.decoded = await this.account.client.abi.decode_message_body({
                            abi: this.account.abi,
                            body: item.message.body,
                            is_internal: item.message.msg_type === 0,
                            allow_partial: true,
                        })
                    } catch {}
                }),
            )
        }
        messages.push(...page)

        if (!all || !pageInfo.hasPreviousPage) return messages

        await sleep(300)
        return await this.getMessages(
            { ...variables, cursor: pageInfo.endCursor },
            decode,
            all,
            messages,
        )
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

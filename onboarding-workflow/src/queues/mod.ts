import Queue from 'npm:bee-queue'
import { getRedisClient } from '../redis/mod.ts'
import {
    CHECK_ACCOUNT_QUEUE,
    CHECK_WALLET_ACCESS_QUEUE,
    CREATE_GOSH_REPO_QUEUE,
} from './constants.ts'

const defaultProducerSettings = {
    isWorker: false,
    activateDelayedJobs: true,
    getEvents: true,
}

const defaultConsumerSettings = {
    isWorker: true,
    getEvents: true,
}

// deno-lint-ignore no-explicit-any
function defaultProducer<T = any>(queue_name: string, settings?: Queue.QueueSettings) {
    return new Queue<T>(queue_name, {
        redis: getRedisClient(),
        ...defaultProducerSettings,
        ...settings,
    })
}

// deno-lint-ignore no-explicit-any
function defaultConsumer<T = any>(queue_name: string, settings?: Queue.QueueSettings) {
    return new Queue<T>(queue_name, {
        redis: getRedisClient(),
        ...defaultConsumerSettings,
        ...settings,
    })
}

export type CheckAccountRequest = { addr: string }

export function checkAccountProducer(settings?: Queue.QueueSettings) {
    return defaultProducer<CheckAccountRequest>(CHECK_ACCOUNT_QUEUE, settings)
}

export function checkAccountConsumer(settings?: Queue.QueueSettings) {
    return defaultConsumer<CheckAccountRequest>(CHECK_ACCOUNT_QUEUE, settings)
}

export type CheckWalletAccessRequest = { wallet_addr: string; wallet_pubkey: string }

export function checkWalletAccessProducer(settings?: Queue.QueueSettings) {
    return defaultProducer<CheckWalletAccessRequest>(CHECK_WALLET_ACCESS_QUEUE, settings)
}

export function checkWalletAccessConsumer(settings?: Queue.QueueSettings) {
    return defaultConsumer<CheckWalletAccessRequest>(CHECK_WALLET_ACCESS_QUEUE, settings)
}

export type CreateGoshRepoRequest = { github_id: string }

export function createGoshRepoProducer(settings?: Queue.QueueSettings) {
    return defaultProducer<CreateGoshRepoRequest>(CREATE_GOSH_REPO_QUEUE, settings)
}

export function createGoshRepoConsumer(settings?: Queue.QueueSettings) {
    return defaultConsumer<CreateGoshRepoRequest>(CREATE_GOSH_REPO_QUEUE, settings)
}

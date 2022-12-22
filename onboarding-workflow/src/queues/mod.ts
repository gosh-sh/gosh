import Queue from 'npm:bee-queue'
import { getRedisClient } from '../redis/mod.ts'
import {
    CHECK_ACCOUNT_QUEUE,
    CHECK_WALLET_ACCESS_QUEUE,
    CREATE_DAO_QUEUE,
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

// TODO: add job.data types
export function checkAccountProducer(settings?: Queue.QueueSettings) {
    return defaultProducer<{ addr: string }>(CHECK_ACCOUNT_QUEUE, settings)
}

export function checkAccountConsumer(settings?: Queue.QueueSettings) {
    return defaultConsumer<{ addr: string }>(CHECK_ACCOUNT_QUEUE, settings)
}

export function checkWalletAccessProducer(settings?: Queue.QueueSettings) {
    return defaultProducer<{ wallet_addr: string; wallet_pubkey: string }>(
        CHECK_WALLET_ACCESS_QUEUE,
        settings,
    )
}

export function checkWalletAccessConsumer(settings?: Queue.QueueSettings) {
    return defaultConsumer<{ wallet_addr: string; wallet_pubkey: string }>(
        CHECK_WALLET_ACCESS_QUEUE,
        settings,
    )
}

export function createGoshRepoProducer(settings?: Queue.QueueSettings) {
    return defaultProducer<{ github_id: string }>(CREATE_GOSH_REPO_QUEUE, settings)
}

export function createGoshRepoConsumer(settings?: Queue.QueueSettings) {
    return defaultConsumer<{ github_id: string }>(CREATE_GOSH_REPO_QUEUE, settings)
}

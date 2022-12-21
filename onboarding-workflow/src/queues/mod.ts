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

function defaultProducer(queue_name: string, settings?: Queue.QueueSettings) {
    return new Queue(queue_name, {
        redis: getRedisClient(),
        ...defaultProducerSettings,
        ...settings,
    })
}

function defaultConsumer(queue_name: string, settings?: Queue.QueueSettings) {
    return new Queue(queue_name, {
        redis: getRedisClient(),
        ...defaultConsumerSettings,
        ...settings,
    })
}

// TODO: add job.data types
export function checkAccountProducer(settings?: Queue.QueueSettings) {
    return defaultProducer(CHECK_ACCOUNT_QUEUE, settings)
}

export function checkAccountConsumer(settings?: Queue.QueueSettings) {
    return defaultConsumer(CHECK_ACCOUNT_QUEUE, settings)
}

export function checkWalletAccessProducer(settings?: Queue.QueueSettings) {
    return defaultProducer(CHECK_WALLET_ACCESS_QUEUE, settings)
}

export function checkWalletAccessConsumer(settings?: Queue.QueueSettings) {
    return defaultConsumer(CHECK_WALLET_ACCESS_QUEUE, settings)
}

export function createGoshRepoProducer(settings?: Queue.QueueSettings) {
    return defaultProducer(CREATE_GOSH_REPO_QUEUE, settings)
}

export function createGoshRepoConsumer(settings?: Queue.QueueSettings) {
    return defaultConsumer(CREATE_GOSH_REPO_QUEUE, settings)
}

export function createDaoProducer(settings?: Queue.QueueSettings) {
    return defaultProducer(CREATE_DAO_QUEUE, settings)
}

export function createDaoConsumer(settings?: Queue.QueueSettings) {
    return defaultConsumer(CREATE_DAO_QUEUE, settings)
}

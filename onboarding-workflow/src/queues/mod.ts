import Queue from 'npm:bee-queue'
import { getRedisClient } from '../redis/mod.ts'
import {
    CHECK_ACCOUNT_QUEUE,
    CHECK_WALLET_ACCESS_QUEUE,
    COUNT_GIT_OBJECTS_QUEUE,
    CREATE_SMALL_GOSH_REPO_QUEUE,
    CREATE_MEDIUM_GOSH_REPO_QUEUE,
    CREATE_LARGE_GOSH_REPO_QUEUE,
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

export type CreateSmallGoshRepoRequest = { github_id: string }

export function createSmallGoshRepoProducer(settings?: Queue.QueueSettings) {
    return defaultProducer<CreateSmallGoshRepoRequest>(
        CREATE_SMALL_GOSH_REPO_QUEUE,
        settings,
    )
}

export function createSmallGoshRepoConsumer(settings?: Queue.QueueSettings) {
    return defaultConsumer<CreateSmallGoshRepoRequest>(
        CREATE_SMALL_GOSH_REPO_QUEUE,
        settings,
    )
}

export type CreateMediumGoshRepoRequest = { github_id: string }

export function createMediumGoshRepoProducer(settings?: Queue.QueueSettings) {
    return defaultProducer<CreateMediumGoshRepoRequest>(
        CREATE_MEDIUM_GOSH_REPO_QUEUE,
        settings,
    )
}

export function createMediumGoshRepoConsumer(settings?: Queue.QueueSettings) {
    return defaultConsumer<CreateMediumGoshRepoRequest>(
        CREATE_MEDIUM_GOSH_REPO_QUEUE,
        settings,
    )
}

export type CreateLargeGoshRepoRequest = { github_id: string }

export function createLargeGoshRepoProducer(settings?: Queue.QueueSettings) {
    return defaultProducer<CreateLargeGoshRepoRequest>(
        CREATE_LARGE_GOSH_REPO_QUEUE,
        settings,
    )
}

export function createLargeGoshRepoConsumer(settings?: Queue.QueueSettings) {
    return defaultConsumer<CreateLargeGoshRepoRequest>(
        CREATE_LARGE_GOSH_REPO_QUEUE,
        settings,
    )
}

export type CountGitObject = { github_id: string }

export function countGitObjectsProducer(settings?: Queue.QueueSettings) {
    return defaultProducer<CountGitObject>(COUNT_GIT_OBJECTS_QUEUE, settings)
}

export function countGitObjectsConsumer(settings?: Queue.QueueSettings) {
    return defaultConsumer<CountGitObject>(COUNT_GIT_OBJECTS_QUEUE, settings)
}

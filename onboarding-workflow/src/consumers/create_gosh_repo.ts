import { initializeGoshRepo } from '../gosh_repo/tasks.ts'
import { CREATE_GOSH_REPO_QUEUE } from '../queues/constants.ts'
import Queue from '../queues/mod.ts'
import { getRedisClient } from '../redis/mod.ts'

const createGoshRepoConsumer = new Queue(CREATE_GOSH_REPO_QUEUE, {
    redis: getRedisClient(),
    isWorker: true,
    getEvents: true,
})

createGoshRepoConsumer.process(async (job) => {
    console.log('Got', job.data)
    const { github_id } = job.data

    await initializeGoshRepo(github_id)
})

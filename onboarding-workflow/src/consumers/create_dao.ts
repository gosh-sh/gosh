import { createDao } from '../dao/tasks.ts'
import { CREATE_DAO_QUEUE } from '../queues/constants.ts'
import Queue from '../queues/mod.ts'
import { getRedisClient } from '../redis/mod.ts'

const createDaoConsumer = new Queue(CREATE_DAO_QUEUE, {
    redis: getRedisClient(),
    isWorker: true,
    getEvents: true,
})

createDaoConsumer.process(async (job) => {
    console.log('Got', job.data)
    const { dao_name } = job.data
    await createDao(dao_name)
})

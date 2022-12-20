import Queue from 'npm:bee-queue'
import redis from 'npm:redis'

const redisUrl = () => Deno.env.get('REDIS_URL') ?? ''
const getRedisClient = () => redis.createClient({ url: redisUrl() })

const CREATE_DAO_QUEUE = 'create_dao'

export const createDaoQueueWorker = new Queue(CREATE_DAO_QUEUE, {
    redis: getRedisClient(),
})

createDaoQueueWorker.process(async (job) => {
    console.log(job.data)
    throw new Error('error')
})

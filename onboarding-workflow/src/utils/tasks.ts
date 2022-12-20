import Queue from 'npm:bee-queue'
import redis from 'npm:redis'

const redisUrl = () => Deno.env.get('REDIS_URL') ?? ''
const getRedisClient = () => redis.createClient({ url: redisUrl() })

const CREATE_DAO_QUEUE = 'create_dao'
const CREATE_DAO_BOT_PROFILE_QUEUE = 'create_dao_bot_profile'

export const createDaoQueue = new Queue(CREATE_DAO_QUEUE, {
    redis: getRedisClient(),
    isWorker: false,
    activateDelayedJobs: true,
    getEvents: true,
})

// console.log(createDaoQueue)
createDaoQueue
    .createJob({ 1: 1 })
    .retries(5)
    .backoff('fixed', 1000)
    .save()
    .then((job) => {
        job.on('succeeded', (res) => {
            console.log('res succeeded', res)
        })
        job.on('failed', (err) => {
            console.log('res failed', err.message)
        })
        job.on('retrying', (err) => {
            console.log('res retrying', err.message)
        })
        console.log(job.status)
    })

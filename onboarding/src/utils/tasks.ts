import Queue from 'npm:bee-queue'

const redisHost = () => Deno.env.get('REDIS_HOST') ?? ''

export const getQueue = (isWorker: boolean) => {
    return new Queue('prepare_push', {
        redis: {
            host: redisHost(),
        },
        isWorker,
    })
}

export const queueWelcomeEmail = (isWorker: boolean) => {
    return new Queue('welcome_email', {
        redis: {
            host: redisHost(),
        },
        isWorker,
    })
}

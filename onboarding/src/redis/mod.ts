import redis from 'npm:redis'

const redisUrl = () => Deno.env.get('REDIS_URL') ?? ''

export function getRedisClient() {
    const url = redisUrl()
    if (!url) throw new Error('Specify redis url')
    return redis.createClient({ url })
}

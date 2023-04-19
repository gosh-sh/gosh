// import { createClient } from 'npm:redis'

const redisUrl = () => Deno.env.get('REDIS_URL') ?? ''

export function getRedisClient() {
    const { hostname: host, port } = new URL(redisUrl())
    return { host, port }
}

// TODO: it's recommended to use RedisClient instance instead of options
// export function getRedisClient() {
//     const url = redisUrl()
//     console.log('Redis url', url)
//     if (!url) throw new Error('Specify redis url')
//     return createClient({ url: url })
// }

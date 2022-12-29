import { createSupabaseClient } from './utils/db'
import { getQueue } from './utils/tasks'

const supabase = createSupabaseClient('public')
const queue = getQueue(true)

queue.process(async (job, done) => {
    console.log(`Processing job ${job.id}`)
    return done(null, job.data.x + job.data.y)
})

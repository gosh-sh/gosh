import * as dotenv from 'https://deno.land/x/dotenv@v3.2.0/mod.ts'
import { createSupabaseClient } from './utils/db.ts'
import { getQueue } from './utils/tasks.ts'

dotenv.config({ export: true })

const supabase = createSupabaseClient('public')
const queue = getQueue(false)

const job = queue.createJob({ x: 2, y: 3 })
job.save()
job.on('succeeded', (result) => {
    console.log(`Received result for job ${job.id}: ${result}`)
})

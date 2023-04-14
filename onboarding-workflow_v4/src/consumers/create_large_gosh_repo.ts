import { initializeGoshRepo } from '../actions/gosh_repo.ts'
import { createLargeGoshRepoConsumer } from '../queues/mod.ts'

console.log('Ready')

createLargeGoshRepoConsumer().process(async (job) => {
    console.log('Got', job.data)
    const { github_id } = job.data
    await initializeGoshRepo(github_id)
})

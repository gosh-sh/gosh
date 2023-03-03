import { initializeGoshRepo } from '../actions/gosh_repo.ts'
import { createSmallGoshRepoConsumer } from '../queues/mod.ts'

console.log('Ready')

createSmallGoshRepoConsumer().process(async (job) => {
    console.log('Got', job.data)
    const { github_id } = job.data
    await initializeGoshRepo(github_id)
})

import { countGitObjects } from '../actions/count_git_objects.ts'
import { countGitObjectsConsumer } from '../queues/mod.ts'

console.log('Ready')

countGitObjectsConsumer().process(async (job) => {
    console.log('Got', job.data)
    const { github_id } = job.data
    await countGitObjects(github_id)
})

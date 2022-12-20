import { getGithub, getGithubsForDaoBot } from '../github/github.ts'
import { CREATE_GOSH_REPO_QUEUE } from '../queues/constants.ts'
import Queue from '../queues/mod.ts'
import { getRedisClient } from '../redis/mod.ts'

const createGoshRepoConsumer = new Queue(CREATE_GOSH_REPO_QUEUE, {
    redis: getRedisClient(),
    isWorker: true,
    getEvents: true,
})

createGoshRepoConsumer.process(async (job) => {
    console.log('Got', job.data)
    const { repo_id } = job.data
    const github_repo = getGithub(repo_id)

    // 1. create repo on blockchain
    await createRepo(github_repo)

    // 2. run shell to upload

    // 3. updated_at field in supabase
})

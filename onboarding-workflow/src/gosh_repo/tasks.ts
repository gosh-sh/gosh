import { getGithubWithDaoBot } from '../github/github.ts'
import { getRepoNameFromUrl } from './utils.ts'

export async function initializeGoshRepo(github_id: string) {
    const github = await getGithubWithDaoBot(github_id)
    if (!github.dao_bot) {
        throw new Error('Repo has no dao_bot')
    }

    const repo_name = getRepoNameFromUrl(github.gosh_url)
    if (!repo_name) {
        throw new Error('Repo name is empty')
    }
    // 1. create gosh repo
    await createGoshRepo()

    // 2. run shell to upload
    await runPushRepo()

    // 3. updated_at field in supabase
    // await updateGithubUploadTime()
}

async function createGoshRepo() {}

async function runPushRepo() {}

import { Github } from '../github/github.ts'
import { getRepoNameFromUrl } from './utils.ts'

export async function createGoshRepo(github: Github) {
    const repo_name = getRepoNameFromUrl(github.gosh_url)
    if (!repo_name) {
        throw new Error('Repo name is empty')
    }
}

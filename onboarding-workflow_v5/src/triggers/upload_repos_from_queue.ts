import { sleep } from 'https://deno.land/x/sleep@v1.2.1/mod.ts'
import { Mutex } from 'https://deno.land/x/semaphore@v1.1.2/mod.ts'
import {getDb} from "../db/db.ts";
import {Github} from "../db/github.ts";
import {initializeGoshRepo} from "../actions/gosh_repo.ts";

const mutex = new Mutex()

export const REPO_OBJECTS_LIMIT = 2000

while (true) {
    await uploadRepos()
    console.log('Sleep...')
    await sleep(30)
}

async function uploadRepos() {
    const release = await mutex.acquire()
    let repos: Github[]
    try {
        repos = await getReposForUpload()
    } catch (err) {
        console.error('Failed to get repo list', err)
    }
    for (const github of repos) {
        if (github.objects < REPO_OBJECTS_LIMIT) {
            console.log('Start upload of repo ', github.id)
            console.log('Repo url ', github.github_url)
            console.log('Number of objects ', github.objects)
            try {
                await initializeGoshRepo(github.id)
            } catch (err) {
                console.error('Failed to upload repo', err)
            }
        } else {
            console.log('Skip upload of repo ', github.id)
            console.log('Repo url ', github.github_url)
            console.log('Number of objects ', github.objects)
        }
    }

    release()
}

async function getReposForUpload(): Promise<Github[]> {
    const { data, error } = await getDb()
        .from('github')
        .select()
        .is('updated_at', null)
        .not('objects', 'is', null)
        .eq('ignore', false)
        .order('objects', { ascending: true })
    if (error) {
        console.error(error)
        throw new Error(error.message)
    }
    return data
}

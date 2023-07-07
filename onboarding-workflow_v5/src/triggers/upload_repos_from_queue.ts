import { sleep } from 'https://deno.land/x/sleep@v1.2.1/mod.ts'
import { Mutex } from 'https://deno.land/x/semaphore@v1.1.2/mod.ts'
import {getDb} from "../db/db.ts";
import {Github} from "../db/github.ts";
import {initializeGoshRepo} from "../actions/gosh_repo.ts";

const mutex = new Mutex()

while (true) {
    await uploadRepos()
    console.log('Sleep...')
    await sleep(30)
}

async function uploadRepos() {
    const release = await mutex.acquire()
    try {
        const repos: Github[] = await getReposForUpload()

        for (const github of repos) {
            console.log('Start upload of repo ', github.id)
            console.log('Repo url ', github.github_url)
            console.log('Number of objects ', github.objects)
            try {
                await initializeGoshRepo(github.id)
            } catch (err) {
                console.error('Failed to upload repo', err)
            }
        }
    } catch (err) {
        console.error('Failed to upload repos', err)
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

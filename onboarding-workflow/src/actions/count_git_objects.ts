import BeeQueue from '../../../../../../.cache/deno/npm/registry.npmjs.org/bee-queue/1.5.0/index.d.ts'
import { getDb } from '../db/db.ts'
import { getGithubWithDaoBot } from '../db/github.ts'
import type {
    CreateLargeGoshRepoRequest,
    CreateMediumGoshRepoRequest,
    CreateSmallGoshRepoRequest,
} from '../queues/mod.ts'
import {
    createLargeGoshRepoProducer,
    createMediumGoshRepoProducer,
    createSmallGoshRepoProducer,
} from '../queues/mod.ts'

export async function countGitObjects(github_id: string) {
    const github = await getGithubWithDaoBot(github_id)
    console.log('count git objects for', github)

    const workdir = `/tmp/github/${github_id}`
    const gitdir = `${workdir}/repo`
    await Deno.mkdir(workdir, { recursive: true })

    const github_full_repo_url = `https://github.com${github.github_url}`

    const git_clone = Deno.run({
        cmd: ['git', 'clone', github_full_repo_url, gitdir],
        cwd: workdir,
    })
    const clone_status = await git_clone.status()
    if (!clone_status.success) {
        console.log(`Can't clone`, github_id)
        return
    }

    // count git objects
    const count_git_objects = Deno.run({
        cmd: ['git', 'rev-list', '--all', '--count', '--objects'],
        cwd: gitdir,
        stdout: 'piped',
    })

    if (!(await count_git_objects.status()).success) {
        console.log(`Fail to get number of git objects`, github_id)
        return
    }

    const out_str = new TextDecoder().decode(await count_git_objects.output()).trim()
    const number_of_git_objects = parseInt(out_str, 10)

    console.log(`Repo`, github_id, `contains`, number_of_git_objects)

    await getDb()
        .from('github')
        .update({ objects: number_of_git_objects })
        .eq('id', github.id)

    // cleanup
    console.log('About to remove dir', workdir)
    await Deno.remove(workdir, { recursive: true })
    console.log('Dir removed', github_id)

    // EXPLANATION: we split repos to 3 buckets by size: small | medium | large
    // TODO: more logs
    let producer: BeeQueue<
        | CreateSmallGoshRepoRequest
        | CreateMediumGoshRepoRequest
        | CreateLargeGoshRepoRequest
    >
    if (number_of_git_objects < 1500) {
        producer = createSmallGoshRepoProducer()
    } else if (number_of_git_objects < 15000) {
        producer = createMediumGoshRepoProducer()
    } else {
        producer = createLargeGoshRepoProducer()
    }

    console.log('Schedule upload repository', github.id)
    producer
        .createJob({
            github_id: github.id,
        })
        // deduplication
        .setId(github.id)
        .retries(5)
        .save()
}

import { getDb } from '../db/db.ts'
import { getGithubWithDaoBot } from '../db/github.ts'
import {
    createLargeGoshRepoProducer,
    createMediumGoshRepoProducer,
    createSmallGoshRepoProducer,
} from '../queues/mod.ts'
import { processOutputDump } from '../utils/deno_run.ts'

export const SMALL_REPO_OBJECTS_LIMIT = 1500
export const MEDIUM_REPO_OBJECTS_LIMIT = 15000

export async function countGitObjects(github_id: string) {
    const github = await getGithubWithDaoBot(github_id)
    console.log('count git objects for', github)

    const workdir = `/tmp/github/${github_id}`
    let number_of_git_objects: number

    if (github.objects !== null && github.objects > MEDIUM_REPO_OBJECTS_LIMIT) {
        // do not recalculate big repositorioes
        number_of_git_objects = github.objects
    } else {
        const gitdir = `${workdir}/repo`
        await Deno.mkdir(workdir, { recursive: true })

        const github_full_repo_url = `https://github.com${github.github_url}`

        const git_clone = new Deno.Command('git', {
            args: ['clone', github_full_repo_url, gitdir],
            cwd: workdir,
            stdout: 'piped',
            stderr: 'piped',
        })
        const clone_status = await git_clone.output()
        if (!clone_status.success) {
            console.log(`Can't clone`, github_id)

            await getDb()
                .from('github')
                .update({
                    resolution: await processOutputDump(clone_status),
                    ignore: true,
                })
                .eq('id', github.id)
            return
        }

        // count git objects
        const count_git_objects = new Deno.Command('git', {
            args: ['rev-list', '--all', '--count', '--objects'],
            cwd: gitdir,
            stdout: 'piped',
            stderr: 'piped',
        })

        const git_objects_status = await count_git_objects.output()

        if (!git_objects_status.success) {
            console.log(`Fail to get number of git objects`, github_id)

            await getDb()
                .from('github')
                .update({
                    resolution: await processOutputDump(git_objects_status),
                })
                .eq('id', github.id)
            return
        }

        const out_str = new TextDecoder().decode(git_objects_status.stdout).trim()

        number_of_git_objects = parseInt(out_str, 10)

        // cleanup
        console.log('About to remove dir: ', workdir)
        await Deno.remove(workdir, { recursive: true })
        console.log('Dir removed', github_id)
    }

    console.log(`Repo`, github_id, `contains`, number_of_git_objects)

    await getDb()
        .from('github')
        .update({ objects: number_of_git_objects })
        .eq('id', github.id)

    // EXPLANATION: we split repos to 3 buckets by size: small | medium | large
    // TODO: more logs
    // let producer
    // if (number_of_git_objects < SMALL_REPO_OBJECTS_LIMIT) {
    //     console.log('Added to the queue of small repos')
    //     producer = createSmallGoshRepoProducer()
    // } else if (number_of_git_objects < MEDIUM_REPO_OBJECTS_LIMIT) {
    //     console.log('Added to the queue of medium repos')
    //     producer = createMediumGoshRepoProducer()
    // } else {
    //     console.log('Added to the queue of large repos')
    //     producer = createLargeGoshRepoProducer()
    // }

    // console.log('Schedule upload repository', github.id)
    // producer
    //     .createJob({
    //         github_id: github.id,
    //     })
    //  //   deduplication
        // .setId(github.id)
        // .retries(5)
        // .save()
}

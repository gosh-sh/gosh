import * as dotenv from 'https://deno.land/x/dotenv@v3.2.0/mod.ts'
import { sleep } from 'https://deno.land/x/sleep@v1.2.1/mod.ts'
import { getDb } from './db/db.ts'
import {
    deployAloneDaoWallet,
    getAddrDao,
    isDaoMember,
    setAloneDaoConfig,
} from './eversdk/dao.ts'
import { calculateProfileAddr } from './eversdk/dao_bot.ts'
import { getAddrWallet } from './eversdk/gosh_repo.ts'

dotenv.config({ export: true })

// TODO: sub on "all daos are ready"
const { data, error } = await getDb()
    .from('users')
    .select(`*, githubs:github(count)`)
    .is('onboarded_at', null)
    .not('github.updated_at', 'is', null)

if (data) console.log(data)
if (error) console.log(error)

// -- drop view if exists view_ready_users;
// -- create or replace VIEW public.view_ready_users AS (
// select
//   u.*,
//   count(*) as repo_count
// from
//   users as u
//   join github as gh on gh.user_id = u.id
// -- where
// --   gh.updated_at is null  -- all gh repo are updated
// group by
//   u.id
// -- );

while (true) {
    const { data, error } = await getDb()
        .from('users')
        .select(`*, github (updated_at, dao_bot (dao_name, profile_gosh_address, seed))`)
    if (error) {
        throw new Error(error.message)
    }
    if (!data) {
        await sleep(10)
    }

    // Filter users
    // User `onboarded_at` should be null, all user repos should have
    // date at `updated_at` field
    const ready = data
        .filter(({ onboarded_at }) => !onboarded_at)
        .filter(({ github }) => {
            if (!github) {
                return false
            }
            const repos = Array.isArray(github) ? github : [github]
            return repos.every(({ updated_at }) => !!updated_at)
        })

    // Iterate ready for onboarding data
    console.log('Ready', ready)
    for (const user of ready) {
        // Collect unique DAOs for user
        const github = Array.isArray(user.github) ? user.github : [user.github]
        const daos: any[] = []
        for (const repo of github) {
            const bots = Array.isArray(repo!.dao_bot) ? repo!.dao_bot : [repo!.dao_bot]
            for (const bot of bots) {
                const index = daos.findIndex(({ dao_name }) => dao_name === bot!.dao_name)
                if (index < 0) {
                    daos.push(bot)
                }
            }
        }
        console.log('DAOs', daos)

        // Get user profile address
        const userProfileAddress = await calculateProfileAddr(user.gosh_username)
        console.log('User profile address', userProfileAddress)

        // Check if user is not a DAO member, add user to DAO
        await Promise.all(
            daos.map(async ({ dao_name, profile_gosh_address, seed }) => {
                const daoAddress = await getAddrDao(dao_name)
                console.log('DAO', dao_name, 'address', daoAddress)
                const isMember = await isDaoMember(daoAddress, userProfileAddress)
                console.log('User is DAO member', isMember)
                if (isMember) {
                    return
                }

                const walletAddress = await getAddrWallet(
                    profile_gosh_address,
                    daoAddress,
                )
                console.log('Wallet address', walletAddress)
                await setAloneDaoConfig(100, walletAddress, seed)
                await deployAloneDaoWallet([userProfileAddress], walletAddress, seed)
            }),
        )

        // Get user email and send onboarding message
        const { data: authUser, error: queryAuthUserError } = await getDb()
            .from('auth_users')
            .select('email')
            .eq('id', user.auth_user)
            .single()
        if (queryAuthUserError) {
            throw new Error(queryAuthUserError.message)
        }
        if (!authUser || !authUser.email) {
            throw new Error(`User ${user.auth_user} not found or has no email address`)
        }
        console.log('Auth user', authUser)

        const mailTo = authUser.email.trim()
        const mailHtmlBody = new TextDecoder().decode(
            Deno.readFileSync('emails/onboarding.html'),
        )

        const { data: emails } = await getDb()
            .from('emails')
            .select()
            .eq('is_welcome', true)
            .eq('mail_to', mailTo)

        console.log(`Emails: ${emails}`)

        if (!emails || emails.length == 0) {
            console.log(`Try create welcome email ${mailTo}`)
            await getDb()
                .from('emails')
                .insert({
                    mail_to: mailTo,
                    subject: 'Welcome to GOSH!',
                    content: `\
Good news!

Your repository has been successfully uploaded to GOSH

Your DAO has been set up for you, and you're now all set to build consensus around your code

START BUILDING https://app.gosh.sh/a/signin
`,
                    html: mailHtmlBody,
                    is_welcome: true,
                })
                .then((res: any) => {
                    console.log(`Email insert:`, res)
                })
        }
    }

    //     for (const user of data) {
    //         const email_list: string[] = []

    //         // TODO: now have to use different TABLE auth.users to get an email
    //         // user.github_users?.forEach((github_user: { email: string[] }) => {
    //         //     if (github_user.email) {
    //         //         email_list.push(github_user.email[0])
    //         //     }
    //         // })

    //         console.log(email_list)

    //         if (email_list.length > 0) {
    //             const mail_to = email_list[0].trim()

    //             const mail_html = new TextDecoder().decode(
    //                 Deno.readFileSync('emails/onboarding.html'),
    //             )

    //             const { data: emails, error } = await getDb()
    //                 .from('emails')
    //                 .select()
    //                 .eq('is_welcome', true)
    //                 .eq('mail_to', mail_to)

    //             console.log(`Emails: ${emails}`)

    //             if (!emails || emails.length == 0) {
    //                 console.log(`Try create welcome email ${mail_to}`)
    //                 await getDb()
    //                     .from('emails')
    //                     .insert({
    //                         mail_to: mail_to,
    //                         subject: 'Welcome to GOSH!',
    //                         content: `\
    // Good news!

    // Your repository has been successfully uploaded to GOSH

    // Your DAO has been set up for you, and you're now all set to build consensus around your code

    // START BUILDING https://app.gosh.sh/a/signin
    // `,
    //                         html: mail_html,
    //                         is_welcome: true,
    //                     })
    //                     .then((res: any) => {
    //                         console.log(`Email insert:`, res)
    //                     })
    //             }
    //         }
    //     }

    //
    console.log('Sleep...')
    await sleep(10)
}

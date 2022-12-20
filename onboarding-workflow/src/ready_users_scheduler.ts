import * as dotenv from 'https://deno.land/x/dotenv@v3.2.0/mod.ts'
import { sleep } from 'https://deno.land/x/sleep@v1.2.1/mod.ts'
import { getDb } from './db/db.ts'

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

/*
while (true) {
    const { data, error } = await getDb().from('users').select(`*, (github)`)

    for (const user of data) {
        const email_list: string[] = []

        // TODO: now have to use different TABLE auth.users to get an email
        // user.github_users?.forEach((github_user: { email: string[] }) => {
        //     if (github_user.email) {
        //         email_list.push(github_user.email[0])
        //     }
        // })

        console.log(email_list)

        if (email_list.length > 0) {
            const mail_to = email_list[0].trim()

            const mail_html = new TextDecoder().decode(
                Deno.readFileSync('emails/onboarding.html'),
            )

            const { data: emails, error } = await getDb()
                .from('emails')
                .select()
                .eq('is_welcome', true)
                .eq('mail_to', mail_to)

            console.log(`Emails: ${emails}`)

            if (!emails || emails.length == 0) {
                console.log(`Try create welcome email ${mail_to}`)
                await getDb()
                    .from('emails')
                    .insert({
                        mail_to: mail_to,
                        subject: 'Welcome to GOSH!',
                        content: `\
Good news!

Your repository has been successfully uploaded to GOSH

Your DAO has been set up for you, and you're now all set to build consensus around your code

START BUILDING https://app.gosh.sh/a/signin
`,
                        html: mail_html,
                        is_welcome: true,
                    })
                    .then((res: any) => {
                        console.log(`Email insert:`, res)
                    })
            }
        }
    }

    //
    console.log('Sleep...')
    await sleep(10)
}
*/

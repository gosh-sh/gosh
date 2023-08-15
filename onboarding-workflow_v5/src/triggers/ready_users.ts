import { sleep } from 'https://deno.land/x/sleep@v1.2.1/mod.ts'
import { getDb } from '../db/db.ts'
import { emailOnboardingFinished } from '../actions/emails/onboarding_finished.ts'
import {
    deployAloneDaoWallet,
    deployAloneDaoWallet_v2,
    deployAloneDaoWallet_v5,
    AloneMintDaoReserve,
    getAddrDao,
    isDaoMember,
    setAloneDaoConfig,
} from '../eversdk/dao.ts'
import { calculateProfileAddr } from '../eversdk/dao_bot.ts'
import { getAddrWallet } from '../eversdk/gosh_repo.ts'

// TODO: sub on "all daos are ready"
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
    const { data, error } = await getDb().from('users').select(`
        *,
        github (
            updated_at,
            dao_bot (dao_name, profile_gosh_address, seed, version)
        )
    `)
    if (error) {
        throw new Error(error.message)
    }
    if (!data) {
        await sleep(30)
        continue
    }

    const version = Deno.env.get('GOSH_VERSION') ?? '0.0.0'
    // Filter users
    // User `onboarded_at` should be null, all user repos should have
    // date at `updated_at` field
    const ready_users = data
        .filter(({ onboarded_at }) => !onboarded_at)
        .filter(({ github }) => !!github )
        .filter(({ github }) => {
            const repos = Array.isArray(github) ? github : [github]
            return repos.length > 0 // && repos.every(({ updated_at }) => !!updated_at)
        })
        .filter(({ github }) => {
            console.log(github)
            const gh = Array.isArray(github) ? github : [github]
            return gh.every(({ dao_bot }) => dao_bot.version  === version)
        })

    // Iterate ready for onboarding data
    console.log('Ready', ready_users)
    for (const user of ready_users) {
        if (!user.auth_user) {
            console.log(`Auth user for user ${user.id} does not exist`)
            continue
        }

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
                const version = Deno.env.get('GOSH_VERSION') ?? ''
                console.log('Version ', version)
                if (version === '1.0.0') {
                    await setAloneDaoConfig(100, walletAddress, seed)
                    await deployAloneDaoWallet([userProfileAddress], walletAddress, seed)
                } else {
                    await AloneMintDaoReserve(100, walletAddress, seed)
                    if (version === '5.1.0') {
                        await deployAloneDaoWallet_v5(
                            userProfileAddress,
                            walletAddress,
                            seed,
                            100,
                        )
                    } else {
                        await deployAloneDaoWallet_v2(
                            userProfileAddress,
                            walletAddress,
                            seed,
                            100,
                        )
                    }
                }
            }),
        )

        // Send onboarding message
        const { data: authUser, error: authUserError } =
            await getDb().auth.admin.getUserById(user.auth_user)
        if (authUserError) {
            throw new Error(authUserError.message)
        }

        await emailOnboardingFinished(authUser.user)

        const { error } = await getDb()
            .from('users')
            .update({
                onboarded_at: new Date().toISOString(),
            })
            .eq('id', user.id)
        if (!error) {
            console.log('User onboarding finished', user)
        }
    }

    console.log('Sleep...')
    await sleep(30)
}

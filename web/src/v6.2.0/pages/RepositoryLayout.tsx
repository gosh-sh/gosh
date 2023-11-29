import { useEffect } from 'react'
import { useErrorBoundary, withErrorBoundary } from 'react-error-boundary'
import { GoshAdapterFactory, useBranches, useRepo } from 'react-gosh'
import { Outlet, useParams } from 'react-router-dom'
import { AppConfig } from '../../appconfig'
import Alert from '../../components/Alert'
import { withPin } from '../hocs'
import { useRepository } from '../hooks/repository.hooks'
import { useUser } from '../hooks/user.hooks'

const RepoLayout = () => {
    const { daoname, reponame, branch } = useParams()
    const { showBoundary } = useErrorBoundary()
    const { user, persist } = useUser()
    const { error } = useRepository({ initialize: true })
    const {
        dao: _rg_dao,
        repository: _rg_repo,
        isFetching,
    } = useRepo(daoname!, reponame!)
    const { updateBranches } = useBranches(_rg_repo.adapter, branch)

    useEffect(() => {
        if (error) {
            showBoundary(error)
        }
    }, [error])

    // TODO: Remove this after git part refactor
    useEffect(() => {
        Object.keys(AppConfig.getVersions())
            .map((version) => {
                return GoshAdapterFactory.create(version)
            })
            .map((gosh) => {
                const { username } = persist
                const { keys } = user
                if (username && keys) {
                    gosh.setAuth(username, keys)
                } else {
                    gosh.resetAuth()
                }
            })
    }, [])

    useEffect(() => {
        const _setup = async () => {
            await updateBranches()
        }

        _setup()
    }, [updateBranches])
    // /TODO: Remove this after git part refactor

    return (
        <Outlet
            context={{ dao: _rg_dao, repository: _rg_repo, is_fetching: isFetching }}
        />
    )
}

export default withErrorBoundary(withPin(RepoLayout, { redirect: false }), {
    fallbackRender: ({ error }) => (
        <div>
            <Alert variant="danger">{error.message}</Alert>
        </div>
    ),
})

import { useEffect } from 'react'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import Spinner from '../../components/Spinner'
import {
    githubRepositoriesAtom,
    githubRepositoriesSelector,
    octokitSelector,
    signupStepAtom,
} from '../../store/signup.state'

type TGithubRepositoriesProps = {
    organization: any
}

const GithubRepositories = (props: TGithubRepositoriesProps) => {
    const { organization } = props
    const setGithubRepos = useSetRecoilState(githubRepositoriesAtom)
    const githubOrgRepos = useRecoilValue(githubRepositoriesSelector(organization.id))
    const octokit = useRecoilValue(octokitSelector)
    const setStep = useSetRecoilState(signupStepAtom)

    const onRepositoryCheck = (id: number) => {
        setGithubRepos((state) => ({
            ...state,
            [organization.id]: {
                ...state[organization.id],
                items: state[organization.id].items.map((item) => {
                    if (item.id !== id) return item
                    return { ...item, isSelected: !item.isSelected }
                }),
            },
        }))
    }

    useEffect(() => {
        const _getGithubRepositories = async () => {
            if (!octokit) return

            setGithubRepos((state) => ({
                ...state,
                [organization.id]: {
                    ...state[organization.id],
                    items: state[organization.id]?.items || [],
                    isFetching: true,
                },
            }))

            const { data } = organization.isUser
                ? await octokit.request(
                      'GET /user/repos{?visibility,affiliation,type,sort,direction,per_page,page,since,before}',
                      {
                          visibility: 'public',
                          affiliation: 'owner',
                      },
                  )
                : await octokit.request(
                      'GET /orgs/{org}/repos{?type,sort,direction,per_page,page}',
                      {
                          org: organization.login,
                          type: 'public',
                      },
                  )

            setGithubRepos((state) => ({
                ...state,
                [organization.id]: {
                    ...state[organization.id],
                    items: data.map((item: any) => {
                        const exists = state[organization.id].items.find(
                            (a) => a.id === item.id,
                        )
                        if (exists) return exists
                        return { ...item, isSelected: false }
                    }),
                    isFetching: false,
                },
            }))
        }

        _getGithubRepositories()
    }, [
        octokit,
        organization.id,
        organization.login,
        organization.isUser,
        setGithubRepos,
    ])

    return (
        <div>
            <button type="button" onClick={() => setStep({ index: 1 })}>
                &laquo; Back
            </button>
            <p>Repos for organization {organization.login}</p>

            {githubOrgRepos?.isFetching && (
                <div className="text-gray-606060 text-sm py-3">
                    <Spinner className="mr-3" />
                    Loading repositories...
                </div>
            )}

            {githubOrgRepos?.items.map((item, index) => (
                <div key={index}>
                    <label>
                        <input
                            type="checkbox"
                            checked={item.isSelected}
                            onChange={() => onRepositoryCheck(item.id)}
                        />
                        {item.name}
                    </label>
                </div>
            ))}
        </div>
    )
}

export default GithubRepositories

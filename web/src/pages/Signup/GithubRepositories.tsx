import { faHardDrive } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useCallback, useEffect } from 'react'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import {
    githubRepositoriesAtom,
    githubRepositoriesSelector,
    octokitSelector,
} from '../../store/signup.state'
import GithubEmpty from './GithubEmpty'

type TGithubRepositoriesProps = {
    organization: any
}

const GithubRepositories = (props: TGithubRepositoriesProps) => {
    const { organization } = props
    const setGithubRepos = useSetRecoilState(githubRepositoriesAtom)
    const githubOrgRepos = useRecoilValue(githubRepositoriesSelector(organization.id))
    const octokit = useRecoilValue(octokitSelector)

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

    const getGithubRepositories = useCallback(async () => {
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
    }, [
        octokit,
        organization.id,
        organization.login,
        organization.isUser,
        setGithubRepos,
    ])

    useEffect(() => {
        getGithubRepositories()
    }, [getGithubRepositories])

    return (
        <>
            {!githubOrgRepos?.isFetching && !githubOrgRepos?.items.length && (
                <GithubEmpty />
            )}

            {githubOrgRepos?.items.map((item, index) => (
                <div
                    key={index}
                    className="signup__repoitem repoitem"
                    onClick={() => onRepositoryCheck(item.id)}
                >
                    <div className="repoitem__header">
                        <FontAwesomeIcon icon={faHardDrive} className="repoitem__icon" />
                        <div className="repoitem__title">{item.name}</div>
                        <div className="repoitem__check">
                            <input
                                type="checkbox"
                                checked={item.isSelected}
                                onChange={() => {}}
                            />
                        </div>
                    </div>

                    <p className="repoitem__description">{item.description}</p>

                    <p className="repoitem__secondary">
                        Updated on {new Date(item.updated_at).toLocaleDateString()}
                    </p>
                </div>
            ))}
        </>
    )
}

export default GithubRepositories

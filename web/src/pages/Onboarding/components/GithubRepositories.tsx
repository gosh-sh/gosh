import { faHardDrive } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useCallback, useEffect } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import { Checkbox } from '../../../components/Form'
import Spinner from '../../../components/Spinner'
import { octokitSelector, repositoriesSelector } from '../../../store/onboarding.state'
import {
    TOnboardingOrganization,
    TOnboardingRepository,
} from '../../../store/onboarding.types'
import ListEmpty from './ListEmpty'

type TGithubRepositoriesProps = {
    organization: TOnboardingOrganization
    isOpen: boolean
    signoutOAuth(): Promise<void>
}

const GithubRepositories = (props: TGithubRepositoriesProps) => {
    const { isOpen, organization, signoutOAuth } = props
    const octokit = useRecoilValue(octokitSelector)
    const [repositories, setRepositories] = useRecoilState(
        repositoriesSelector(organization.id),
    )

    const onRepositoryClick = (item: TOnboardingRepository) => {
        setRepositories((state) => ({
            ...state,
            items: state.items.map((s) => {
                if (s.id !== item.id) {
                    return s
                }
                return { ...item, isSelected: !item.isSelected }
            }),
        }))
    }

    const getRepositories = useCallback(async () => {
        if (!octokit || !isOpen) return

        setRepositories((state) => ({ ...state, isFetching: true }))
        try {
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
                          org: organization.name,
                          type: 'public',
                      },
                  )

            const items = data.map((item: any) => ({
                daoName: organization.name,
                id: item.id,
                name: item.name,
                description: item.description,
                updatedAt: item.updated_at,
            }))
            setRepositories((state) => ({
                ...state,
                items: items.map((item: any) => {
                    const found = state.items.find((i) => i.id === item.id)
                    if (found) {
                        return { ...found, ...item }
                    }
                    return { ...item, isSelected: false }
                }),
            }))
        } catch (e: any) {
            console.error(e.message)
            await signoutOAuth()
            return
        }
    }, [
        octokit,
        organization.name,
        organization.isUser,
        setRepositories,
        isOpen,
        signoutOAuth,
    ])

    useEffect(() => {
        getRepositories()
    }, [])

    return (
        <>
            {repositories.isFetching && !repositories.items.length && (
                <div className="p-5 text-sm text-gray-53596d">
                    <Spinner className="mr-3" />
                    Loading respositories...
                </div>
            )}

            {!repositories.isFetching && !repositories.items.length && (
                <ListEmpty>You should have at least one repository on GitHub</ListEmpty>
            )}

            {repositories.items.map((item, index) => (
                <div
                    key={index}
                    className="signup__repoitem repoitem"
                    onClick={() => onRepositoryClick(item)}
                >
                    <div className="repoitem__header">
                        <FontAwesomeIcon icon={faHardDrive} className="repoitem__icon" />
                        <div className="repoitem__title">{item.name}</div>
                        <div className="repoitem__check z-10">
                            <Checkbox
                                checked={item.isSelected}
                                onClick={(e) => {
                                    e.stopPropagation()
                                }}
                                onChange={() => {}}
                            />
                        </div>
                    </div>

                    <p className="repoitem__description">{item.description}</p>

                    <p className="repoitem__secondary">
                        Updated on {new Date(item.updatedAt).toLocaleDateString()}
                    </p>
                </div>
            ))}
        </>
    )
}

export default GithubRepositories

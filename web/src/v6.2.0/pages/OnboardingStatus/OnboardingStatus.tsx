import { faRotateRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Button } from '../../../components/Form'
import Loader from '../../../components/Loader/Loader'
import Spinner from '../../../components/Spinner'
import { ToastError } from '../../../components/Toast'
import { PERSIST_REDIRECT_KEY } from '../../../constants'
import { useOauth } from '../../hooks/oauth.hooks'
import { useOnboardingStatus } from '../../hooks/onboarding.hooks'
import ListEmpty from '../Onboarding/components/ListEmpty'
import DaoListItem from './components/DaoListItem'
import Profile from './components/Profile'
import RepoListItem from './components/RepoListItem'

const OnboardingStatusPage = () => {
  const navigate = useNavigate()
  const { oauth, signin } = useOauth()
  const { data, getData, toggleDao, setDaoName, setRepoName, submit, signout } =
    useOnboardingStatus(oauth)

  const signinOAuth = async () => {
    try {
      await signin('github')
    } catch (e: any) {
      console.error(e.message)
      toast.error(<ToastError error={e} />)
    }
  }

  const signoutOAuth = async () => {
    try {
      await signout()
    } catch (e: any) {
      console.error(e.message)
      toast.error(<ToastError error={e} />)
    }
  }

  const getStatusData = useCallback(async () => {
    try {
      await getData()
    } catch (e: any) {
      console.error(e.message)
      toast.error(<ToastError error={e} />)
    }
  }, [oauth.session])

  const onDaoToggle = (name: string) => {
    toggleDao(name)
  }

  const onDaoNameChange = async (index: number, value: string) => {
    await setDaoName(index, value)
  }

  const onRepoNameChange = async (id: string, dao: string, value: string) => {
    await setRepoName(id, dao, value)
  }

  const submitOnboardingData = async () => {
    try {
      await submit()
      await signoutOAuth()

      const redirect = localStorage.getItem(PERSIST_REDIRECT_KEY)
      localStorage.removeItem(PERSIST_REDIRECT_KEY)
      navigate(redirect || '/a/orgs', { replace: true })
    } catch (e: any) {
      console.error(e.message)
      toast.error(<ToastError error={e} />)
    }
  }

  useEffect(() => {
    getStatusData()
  }, [getStatusData])

  return (
    <div className="container pt-20 pb-8">
      {oauth.isLoading && <Loader>Please, wait...</Loader>}

      <div className="flex flex-wrap items-start">
        <div className="basis-1/2 p-0 lg:p-16">
          <Profile
            oauth={oauth}
            data={data.items}
            onSignin={signinOAuth}
            onSignout={signoutOAuth}
            onSubmit={submitOnboardingData}
          />
        </div>
        <div className="grow basis-0">
          <div className="text-end text-gray-7c8db5">
            <Button
              type="button"
              variant="custom"
              disabled={data.isFetching}
              onClick={getStatusData}
            >
              {data.isFetching ? (
                <Spinner size="xs" />
              ) : (
                <FontAwesomeIcon icon={faRotateRight} />
              )}
              <span className="ml-2">Refresh</span>
            </Button>
          </div>

          {!data.isFetching && !data?.items.length && (
            <ListEmpty>You should have at least one pending repository</ListEmpty>
          )}

          <div className="flex flex-col gap-6">
            {data.items.map((item, index) => (
              <DaoListItem
                key={index}
                item={item}
                index={index}
                onDaoToggle={onDaoToggle}
                onDaoNameChange={onDaoNameChange}
              >
                <div>
                  {item.repos.map((repo, i) => (
                    <RepoListItem
                      key={i}
                      item={repo}
                      dao={item.name}
                      onRepoNameChange={onRepoNameChange}
                    />
                  ))}
                </div>
              </DaoListItem>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default OnboardingStatusPage

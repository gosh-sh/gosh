import { Navigate, useNavigate, useLocation, useOutletContext, useParams } from 'react-router-dom'
import { TRepoLayoutOutletContext } from '../RepoLayout'
import { usePush } from 'react-gosh'
import { toast } from 'react-toastify'
import { ToastError } from '../../components/Toast'
import { BlobCommitForm, TBlobCommitFormValues } from '../../components/Commit'
import { useEffect, useState } from 'react'

const BlobCreatePage = () => {
  const treepath = useParams()['*']
  const navigate = useNavigate()
  const { hash, pathname} = useLocation()
  const { daoName, repoName, branchName = 'main' } = useParams()
  const { dao, repository } = useOutletContext<TRepoLayoutOutletContext>()
  const [filetype, setFiletype] = useState<string>("")
  const { push, progress: pushProgress } = usePush(
    dao.details,
    repository.adapter,
    branchName,
  )

  useEffect(() => {
    if(!["#md", "#odt", "#html"].includes(hash)) {
      navigate(pathname, { replace: true })
    }
    setFiletype(hash.substring(1))
  }, [hash])
  
  const urlBack = `/o/${daoName}/r/${repoName}/tree/${branchName}${
    treepath && `/${treepath}`
  }`

  const onPush = async (values: TBlobCommitFormValues) => {
    try {
      const { name, content, title, message, tags, isPullRequest } = values
      const blobObject = {
        treepath: ['', `${treepath ? `${treepath}/` : ''}${name}`],
        original: '',
        modified: content,
      }

      let task
      if (values.task) {
        const assigners = !values.assigners
          ? []
          : typeof values.assigners === 'string'
          ? values.assigners.split(' ')
          : values.assigners
        const reviewers = !values.reviewers
          ? []
          : typeof values.reviewers === 'string'
          ? values.reviewers.split(' ')
          : values.reviewers
        const managers = !values.managers
          ? []
          : typeof values.managers === 'string'
          ? values.managers.split(' ')
          : values.managers
        task = { task: values.task, assigners, reviewers, managers }
      }

      const eventaddr = await push(title, [blobObject], {
        isPullRequest,
        message,
        tags,
        task,
      })
      if (isPullRequest) {
        navigate(`/o/${daoName}/events/${eventaddr || ''}`, { replace: true })
      } else {
        navigate(urlBack)
      }
    } catch (e: any) {
      console.error(e.message)
      toast.error(<ToastError error={e} />)
    }
  }

  if (!dao.details.isAuthMember) {
    return <Navigate to={urlBack} />
  }
  return (
    <div>
      <BlobCommitForm
        dao={dao}
        filetype={filetype}
        repository={repository}
        branch={branchName}
        treepath={treepath!}
        initialValues={{
          name: '',
          title: '',
          content: '',
        }}
        urlBack={urlBack}
        progress={pushProgress}
        onSubmit={onPush}
      />
    </div>
  )
}

export default BlobCreatePage

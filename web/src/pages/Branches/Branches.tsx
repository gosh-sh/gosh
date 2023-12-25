import { useEffect, useState } from 'react'
import { faChevronRight, faLock, faCodeBranch } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Field, Form, Formik, FormikHelpers } from 'formik'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { FormikInput } from '../../components/Formik'
import { useBranchManagement, useBranches } from 'react-gosh'
import { TRepoLayoutOutletContext } from '../RepoLayout'
import { EGoshError, GoshError } from 'react-gosh'
import { toast } from 'react-toastify'
import { ToastError } from '../../components/Toast'
import { TBranch } from 'react-gosh/dist/types/repo.types'
import { BranchOperateProgress, BranchSelect } from '../../components/Branches'
import yup from '../../v1.0.0/yup-extended'
import { Button, Input } from '../../components/Form'
import CommitProgress from '../../components/Commit/CommitProgress'

type TCreateBranchFormValues = {
  newName: string
  from?: TBranch
}

export const BranchesPage = () => {
  const { daoName, repoName } = useParams()
  const { dao, repository } = useOutletContext<TRepoLayoutOutletContext>()
  const navigate = useNavigate()
  const [branchName, setBranchName] = useState<string>('main')
  const { branches, branch, updateBranches } = useBranches(repository.adapter, branchName)
  const {
    create: createBranch,
    destroy: deleteBranch,
    lock: lockBranch,
    unlock: unlockBranch,
    sethead: setheadBranch,
    progress: branchProgress,
    pushProgress,
  } = useBranchManagement(dao.details, repository.adapter)
  const [search, setSearch] = useState<string>('')
  const [filtered, setFiltered] = useState<TBranch[]>(branches)

  const onBranchLock = async (name: string) => {
    try {
      const { eventaddr } = await lockBranch(name)
      navigate(`/o/${daoName}/events/${eventaddr || ''}`, { replace: true })
    } catch (e: any) {
      console.error(e)
      toast.error(<ToastError error={e} />)
    }
  }

  const onBranchUnlock = async (name: string) => {
    try {
      const { eventaddr } = await unlockBranch(name)
      navigate(`/o/${daoName}/events/${eventaddr || ''}`, { replace: true })
    } catch (e: any) {
      console.error(e)
      toast.error(<ToastError error={e} />)
    }
  }

  const onBranchCreate = async (
    values: TCreateBranchFormValues,
    helpers: FormikHelpers<any>,
  ) => {
    try {
      const { newName, from } = values
      if (!from) throw new GoshError(EGoshError.NO_BRANCH)

      await createBranch(newName, from.name)
      helpers.resetForm()
      helpers.setFieldValue('from', values.from)
    } catch (e: any) {
      console.error(e)
      toast.error(<ToastError error={e} />)
    }
  }

  const onBranchDelete = async (name: string) => {
    if (window.confirm(`Delete branch '${name}'?`)) {
      try {
        await deleteBranch(name)
      } catch (e: any) {
        console.error(e)
        toast.error(<ToastError error={e} />)
      }
    }
  }

  const onBranchSetHead = async (name: string) => {
    try {
      await setheadBranch(name)
    } catch (e: any) {
      console.error(e)
      toast.error(<ToastError error={e} />)
    }
  }

  useEffect(() => {
    updateBranches()
  }, [updateBranches])

  useEffect(() => {
    if (search) {
      const pattern = new RegExp(search, 'i')
      setFiltered(branches.filter((item) => item.name.search(pattern) >= 0))
    } else {
      setFiltered(branches)
    }
  }, [branches, search])

  return (
    <>
      <div className="flex flex-wrap justify-between gap-4">
        {dao.details.isAuthMember && (
          <Formik
            initialValues={{ newName: '', from: branch }}
            onSubmit={onBranchCreate}
            validationSchema={yup.object().shape({
              newName: yup
                .string()
                .matches(/^[\w-]+$/, 'Name has invalid characters')
                .max(64, 'Max length is 64 characters')
                .notOneOf(
                  branches.map((b) => b.name),
                  'Branch exists',
                )
                .required('Branch name is required'),
            })}
          >
            {({ isSubmitting, setFieldValue }) => (
              <Form className="grow sm:grow-0 flex flex-wrap items-center gap-3">
                <div className="grow flex items-center">
                  <BranchSelect
                    branch={branch}
                    branches={branches}
                    onChange={(selected) => {
                      if (selected) {
                        setBranchName(selected?.name)
                        setFieldValue('from', selected)
                      }
                    }}
                    disabled={isSubmitting}
                  />
                  <span className="mx-3">
                    <FontAwesomeIcon icon={faChevronRight} size="sm" />
                  </span>
                  <div className="grow">
                    <Field
                      className="w-full"
                      name="newName"
                      component={FormikInput}
                      errorEnabled={false}
                      placeholder="Branch name"
                      autoComplete="off"
                      disabled={isSubmitting}
                      onChange={(e: any) => {
                        setFieldValue('newName', e.target.value.toLowerCase())
                      }}
                      test-id="input-branch-name"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                  test-id="btn-branch-create"
                >
                  Create branch
                </Button>
              </Form>
            )}
          </Formik>
        )}

        <div className="basis-full md:basis-1/4">
          <Input
            type="text"
            placeholder="Search branch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            test-id="input-branch-search"
          />
        </div>
      </div>

      {branchProgress.isFetching && branchProgress.type === 'create' && (
        <div className="mt-4">
          {!pushProgress.completed ? (
            <CommitProgress {...pushProgress} />
          ) : (
            <BranchOperateProgress operation="Deploy" progress={branchProgress.details} />
          )}
        </div>
      )}

      <div className="mt-5 divide-y divide-gray-e6edff">
        {filtered.map((branch, index) => (
          <div
            key={index}
            className="flex flex-wrap gap-x-4 gap-y-2 items-center py-2 text-sm"
          >
            <div className="grow">
              <Link
                to={`/o/${daoName}/r/${repoName}/tree/${branch.name}`}
                className="hover:underline mr-2"
              >
                {branch.name}
              </Link>

              {branch.isProtected && (
                <div className="inline-block rounded-2xl bg-amber-400 text-xs text-white px-2 py-1 mr-2">
                  <FontAwesomeIcon className="mr-1" size="sm" icon={faLock} />
                  Protected
                </div>
              )}

              {repository.details.head === branch.name && (
                <div className="inline-block rounded-2xl bg-amber-400 text-xs text-white px-2 py-1 mr-2">
                  <FontAwesomeIcon className="mr-1" size="sm" icon={faCodeBranch} />
                  Head
                </div>
              )}
            </div>
            <div>
              {dao.details.isAuthMember && (
                <div className="flex gap-x-3">
                  <Button
                    type="button"
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => {
                      branch.isProtected
                        ? onBranchUnlock(branch.name)
                        : onBranchLock(branch.name)
                    }}
                    disabled={branchProgress.isFetching}
                    isLoading={
                      branchProgress.isFetching &&
                      branchProgress.type === '(un)lock' &&
                      branchProgress.name === branch.name
                    }
                  >
                    {branch.isProtected ? 'Unprotect' : 'Protect'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => onBranchSetHead(branch.name)}
                    disabled={
                      branchProgress.isFetching || repository.details.head === branch.name
                    }
                    isLoading={
                      branchProgress.isFetching &&
                      branchProgress.type === 'sethead' &&
                      branchProgress.name === branch.name
                    }
                  >
                    Set head
                  </Button>
                  <Button
                    type="button"
                    variant="outline-danger"
                    size="sm"
                    onClick={() => onBranchDelete(branch.name)}
                    disabled={
                      branch.isProtected ||
                      branchProgress.isFetching ||
                      ['main', 'master'].indexOf(branch.name) >= 0
                    }
                    isLoading={
                      branchProgress.isFetching &&
                      branchProgress.type === 'destroy' &&
                      branchProgress.name === branch.name
                    }
                  >
                    Delete
                  </Button>
                </div>
              )}
            </div>

            {branchProgress.isFetching &&
              branchProgress.type === 'destroy' &&
              branchProgress.name === branch.name && (
                <div className="basis-full">
                  <BranchOperateProgress
                    operation="Delete"
                    progress={branchProgress.details}
                  />
                </div>
              )}
          </div>
        ))}
      </div>
    </>
  )
}

export default BranchesPage

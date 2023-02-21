import { useEffect, useState } from 'react'
import {
    faChevronRight,
    faTrash,
    faLock,
    faCodeBranch,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Field, Form, Formik, FormikHelpers } from 'formik'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { FormikInput } from '../../components/Formik'
import Spinner from '../../components/Spinner'
import { useBranchManagement, useBranches } from 'react-gosh'
import { TRepoLayoutOutletContext } from '../RepoLayout'
import { EGoshError, GoshError } from 'react-gosh'
import { toast } from 'react-toastify'
import ToastError from '../../components/Error/ToastError'
import { TBranch } from 'react-gosh/dist/types/repo.types'
import { BranchOperateProgress, BranchSelect } from '../../components/Branches'
import yup from '../../yup-extended'
import { Button, Input } from '../../components/Form'

type TCreateBranchFormValues = {
    newName: string
    from?: TBranch
}

export const BranchesPage = () => {
    const { daoName, repoName } = useParams()
    const { dao, repository } = useOutletContext<TRepoLayoutOutletContext>()
    const navigate = useNavigate()
    const [branchName, setBranchName] = useState<string>('main')
    const { branches, branch, updateBranches } = useBranches(
        repository.adapter,
        branchName,
    )
    const {
        create: createBranch,
        destroy: deleteBranch,
        lock: lockBranch,
        unlock: unlockBranch,
        sethead: setheadBranch,
        progress: branchProgress,
    } = useBranchManagement(dao.details, repository.adapter)
    const [search, setSearch] = useState<string>('')
    const [filtered, setFiltered] = useState<TBranch[]>(branches)

    const onBranchLock = async (name: string) => {
        try {
            await lockBranch(name)
            navigate(`/o/${daoName}/events`, { replace: true })
        } catch (e: any) {
            console.error(e)
            toast.error(<ToastError error={e} />)
        }
    }

    const onBranchUnlock = async (name: string) => {
        try {
            await unlockBranch(name)
            navigate(`/o/${daoName}/events`, { replace: true })
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
                                        <FontAwesomeIcon
                                            icon={faChevronRight}
                                            size="sm"
                                        />
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
                                                setFieldValue(
                                                    'newName',
                                                    e.target.value.toLowerCase(),
                                                )
                                            }}
                                        />
                                    </div>
                                </div>
                                <Button
                                    type="submit"
                                    isLoading={isSubmitting}
                                    disabled={isSubmitting}
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
                    />
                </div>
            </div>

            {branchProgress.isFetching && branchProgress.type === 'create' && (
                <div className="mt-4">
                    <BranchOperateProgress
                        operation="Deploy"
                        progress={branchProgress.details}
                    />
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
                                    <FontAwesomeIcon
                                        className="mr-1"
                                        size="sm"
                                        icon={faLock}
                                    />
                                    Protected
                                </div>
                            )}

                            {repository.details.head === branch.name && (
                                <div className="inline-block rounded-2xl bg-amber-400 text-xs text-white px-2 py-1 mr-2">
                                    <FontAwesomeIcon
                                        className="mr-1"
                                        size="sm"
                                        icon={faCodeBranch}
                                    />
                                    Head
                                </div>
                            )}
                        </div>
                        <div>
                            {dao.details.isAuthMember && (
                                <>
                                    <button
                                        type="button"
                                        className="btn btn--body px-2.5 py-1.5 text-xs rounded mr-3 !font-normal"
                                        onClick={() => {
                                            branch.isProtected
                                                ? onBranchUnlock(branch.name)
                                                : onBranchLock(branch.name)
                                        }}
                                        disabled={branchProgress.isFetching}
                                    >
                                        {branchProgress.isFetching &&
                                            branchProgress.type === '(un)lock' &&
                                            branchProgress.name === branch.name && (
                                                <Spinner size="xs" />
                                            )}
                                        <span>
                                            {branch.isProtected ? 'Unprotect' : 'Protect'}
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn--body px-2.5 py-1.5 text-xs rounded mr-3 !font-normal"
                                        onClick={() => onBranchSetHead(branch.name)}
                                        disabled={
                                            branchProgress.isFetching ||
                                            repository.details.head === branch.name
                                        }
                                    >
                                        {branchProgress.isFetching &&
                                        branchProgress.type === 'sethead' &&
                                        branchProgress.name === branch.name ? (
                                            <Spinner size="xs" />
                                        ) : (
                                            <FontAwesomeIcon
                                                icon={faCodeBranch}
                                                size="sm"
                                            />
                                        )}
                                        <span className="ml-2">Set head</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="px-2.5 py-1.5 text-white text-xs rounded bg-rose-600
                                        hover:bg-rose-500 disabled:bg-rose-400"
                                        onClick={() => onBranchDelete(branch.name)}
                                        disabled={
                                            branch.isProtected ||
                                            branchProgress.isFetching ||
                                            ['main', 'master'].indexOf(branch.name) >= 0
                                        }
                                    >
                                        {branchProgress.isFetching &&
                                        branchProgress.type === 'destroy' &&
                                        branchProgress.name === branch.name ? (
                                            <Spinner size="xs" />
                                        ) : (
                                            <FontAwesomeIcon icon={faTrash} size="sm" />
                                        )}
                                        <span className="ml-2">Delete</span>
                                    </button>
                                </>
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

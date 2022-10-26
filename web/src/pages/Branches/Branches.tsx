import { useEffect, useState } from 'react'
import {
    faChevronRight,
    faTrash,
    faLock,
    faLockOpen,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Field, Form, Formik, FormikHelpers } from 'formik'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import BranchSelect from '../../components/BranchSelect'
import { TextField } from '../../components/Formik'
import Spinner from '../../components/Spinner'
import { useBranchManagement, useBranches } from 'react-gosh'
import { TRepoLayoutOutletContext } from '../RepoLayout'
import * as Yup from 'yup'
import { useSmvBalance } from '../../hooks/gosh.hooks'
import { EGoshError, GoshError } from 'react-gosh'
import { toast } from 'react-toastify'
import ToastError from '../../components/Error/ToastError'
import { TBranch } from 'react-gosh/dist/types/repo.types'

type TCreateBranchFormValues = {
    newName: string
    from?: TBranch
}

export const BranchesPage = () => {
    const { daoName, repoName } = useParams()
    const { dao, repo } = useOutletContext<TRepoLayoutOutletContext>()
    const navigate = useNavigate()
    const { details: smvDetails } = useSmvBalance(
        dao.adapter,
        dao.details.isAuthenticated,
    )
    const [branchName, setBranchName] = useState<string>('main')
    const { branches, branch, updateBranches } = useBranches(repo, branchName)
    const {
        create: createBranch,
        destroy: deleteBranch,
        status,
        setLockStatusTmp,
    } = useBranchManagement(dao.details, repo)
    const [search, setSearch] = useState<string>('')
    const [filtered, setFiltered] = useState<TBranch[]>(branches)

    /** Lock branch by SMV */
    const onBranchLock = async (name: string) => {
        try {
            setLockStatusTmp(name, true)

            const check = branches.find((branch) => branch.name === name)
            if (check?.isProtected) throw new Error('Branch is already protected')

            if (!repo) throw new GoshError(EGoshError.NO_REPO)
            if (smvDetails.smvBusy) throw new GoshError(EGoshError.SMV_LOCKER_BUSY)
            if (smvDetails.smvBalance < 20)
                throw new GoshError(EGoshError.SMV_NO_BALANCE, { min: 20 })

            await repo.lockBranch(name)
            navigate(`/o/${daoName}/events`, { replace: true })
        } catch (e: any) {
            console.error(e)
            toast.error(<ToastError error={e} />)
        } finally {
            setLockStatusTmp(name, false)
        }
    }

    /** Unlock branch by SMV */
    const onBranchUnlock = async (name: string) => {
        try {
            setLockStatusTmp(name, true)

            const check = branches.find((branch) => branch.name === name)
            if (!check?.isProtected) throw new Error('Branch is not protected')

            if (!repo) throw new GoshError(EGoshError.NO_REPO)
            if (smvDetails.smvBusy) throw new GoshError(EGoshError.SMV_LOCKER_BUSY)
            if (smvDetails.smvBalance < 20)
                throw new GoshError(EGoshError.SMV_NO_BALANCE, { min: 20 })

            await repo.unlockBranch(name)
            navigate(`/o/${daoName}/events`, { replace: true })
        } catch (e: any) {
            console.error(e)
            toast.error(<ToastError error={e} />)
        } finally {
            setLockStatusTmp(name, false)
        }
    }

    /** Create new branch */
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

    /** Delete branch */
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
        <div className="bordered-block px-7 py-8">
            <div className="flex flex-wrap justify-between gap-4">
                {dao.details.isAuthMember && (
                    <Formik
                        initialValues={{ newName: '', from: branch }}
                        onSubmit={onBranchCreate}
                        validationSchema={Yup.object().shape({
                            newName: Yup.string()
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
                                            component={TextField}
                                            errorEnabled={false}
                                            inputProps={{
                                                placeholder: 'Branch name',
                                                autoComplete: 'off',
                                                className: '!text-sm !py-1.5',
                                                disabled: isSubmitting,
                                                onChange: (e: any) => {
                                                    setFieldValue(
                                                        'newName',
                                                        e.target.value.toLowerCase(),
                                                    )
                                                },
                                            }}
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    className="btn btn--body px-3 py-1.5 !text-sm w-full sm:w-auto"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting && <Spinner className="mr-2" />}
                                    Create branch
                                </button>
                            </Form>
                        )}
                    </Formik>
                )}

                <div className="input basis-full md:basis-1/4">
                    <input
                        type="text"
                        className="element !text-sm !py-1.5"
                        placeholder="Search branch..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="mt-5 divide-y divide-gray-c4c4c4">
                {filtered.map((branch, index) => (
                    <div
                        key={index}
                        className="flex gap-4 items-center px-3 py-2 text-sm"
                    >
                        <div className="grow">
                            <Link
                                to={`/o/${daoName}/r/${repoName}/tree/${branch.name}`}
                                className="hover:underline"
                            >
                                {branch.name}
                            </Link>
                        </div>
                        <div>
                            {dao.details.isAuthMember && (
                                <>
                                    <button
                                        type="button"
                                        className="btn btn--body px-2.5 py-1.5 text-xs rounded mr-3"
                                        onClick={() => {
                                            branch.isProtected
                                                ? onBranchUnlock(branch.name)
                                                : onBranchLock(branch.name)
                                        }}
                                        disabled={
                                            smvDetails.smvBusy ||
                                            status[branch.name]?.isBusy
                                        }
                                    >
                                        {status[branch.name]?.isLock ? (
                                            <Spinner size="xs" />
                                        ) : (
                                            <FontAwesomeIcon
                                                icon={
                                                    branch.isProtected
                                                        ? faLockOpen
                                                        : faLock
                                                }
                                                size="sm"
                                            />
                                        )}
                                        <span className="ml-2">
                                            {branch.isProtected ? 'Unlock' : 'Lock'}
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        className="px-2.5 py-1.5 text-white text-xs rounded bg-rose-600
                                        hover:bg-rose-500 disabled:bg-rose-400"
                                        onClick={() => onBranchDelete(branch.name)}
                                        disabled={
                                            branch.isProtected ||
                                            status[branch.name]?.isBusy ||
                                            ['main', 'master'].indexOf(branch.name) >= 0
                                        }
                                    >
                                        {status[branch.name]?.isDestroy ? (
                                            <Spinner size="xs" />
                                        ) : (
                                            <FontAwesomeIcon icon={faTrash} size="sm" />
                                        )}
                                        <span className="ml-2">Delete</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default BranchesPage

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
import TextField from '../../components/FormikForms/TextField'
import Spinner from '../../components/Spinner'
import { TGoshBranch } from 'gosh-react'
import { TRepoLayoutOutletContext } from '../RepoLayout'
import * as Yup from 'yup'
import { useRecoilValue } from 'recoil'
import { goshCurrBranchSelector } from '../../store/gosh.state'
import { useGoshRepoBranches, useSmvBalance } from '../../hooks/gosh.hooks'
import { EGoshError, GoshError } from 'gosh-react'
import { toast } from 'react-toastify'
import { GoshCommit } from 'gosh-react'

type TCreateBranchFormValues = {
    newName: string
    from?: TGoshBranch
}

export const BranchesPage = () => {
    const { daoName, repoName } = useParams()
    const { repo, wallet } = useOutletContext<TRepoLayoutOutletContext>()
    const navigate = useNavigate()
    const smvBalance = useSmvBalance(wallet)
    const [branchName, setBranchName] = useState<string>('main')
    const { branches, updateBranches } = useGoshRepoBranches(repo)
    const branch = useRecoilValue(goshCurrBranchSelector(branchName))
    const [search, setSearch] = useState<string>('')
    const [filtered, setFiltered] = useState<TGoshBranch[]>(branches)
    const [branchesBusy, setBranchesBusy] = useState<{
        [key: string]: { busy: boolean; lock: boolean; delete: boolean }
    }>({})

    /** Lock branch by SMV */
    const onBranchLock = async (name: string) => {
        try {
            setBranchesBusy((state) => ({
                ...state,
                [name]: { ...state[name], busy: true, lock: true },
            }))

            if (await repo.isBranchProtected(name))
                throw new Error('Branch is already protected')
            if (!repoName) throw new GoshError(EGoshError.NO_REPO)
            if (!wallet) throw new GoshError(EGoshError.NO_WALLET)
            if (smvBalance.smvBusy) throw new GoshError(EGoshError.SMV_LOCKER_BUSY)
            if (smvBalance.smvBalance < 20)
                throw new GoshError(EGoshError.SMV_NO_BALANCE, { min: 20 })

            await wallet.startProposalForAddProtectedBranch(repoName, name)
            navigate(`/${daoName}/events`, { replace: true })
        } catch (e: any) {
            console.error(e)
            toast.error(e.message)
        } finally {
            setBranchesBusy((state) => ({
                ...state,
                [name]: { ...state[name], busy: false, lock: false },
            }))
        }
    }

    /** Unlock branch by SMV */
    const onBranchUnlock = async (name: string) => {
        try {
            setBranchesBusy((state) => ({
                ...state,
                [name]: { ...state[name], busy: true, lock: true },
            }))

            const isProtected = await repo.isBranchProtected(name)
            if (!isProtected) throw new Error('Branch is not protected')
            if (!repoName) throw new GoshError(EGoshError.NO_REPO)
            if (!wallet) throw new GoshError(EGoshError.NO_WALLET)
            if (smvBalance.smvBusy) throw new GoshError(EGoshError.SMV_LOCKER_BUSY)
            if (smvBalance.smvBalance < 20)
                throw new GoshError(EGoshError.SMV_NO_BALANCE, { min: 20 })

            await wallet.startProposalForDeleteProtectedBranch(repoName, name)
            navigate(`/${daoName}/events`, { replace: true })
        } catch (e: any) {
            console.error(e)
            toast.error(e.message)
        } finally {
            setBranchesBusy((state) => ({
                ...state,
                [name]: { ...state[name], busy: false, lock: false },
            }))
        }
    }

    /** Create new branch */
    const onBranchCreate = async (
        values: TCreateBranchFormValues,
        helpers: FormikHelpers<any>,
    ) => {
        try {
            if (!values.from) throw new GoshError(EGoshError.NO_BRANCH)
            if (!wallet) throw new GoshError(EGoshError.NO_WALLET)

            const commit = new GoshCommit(wallet.account.client, values.from.commitAddr)
            await wallet.deployBranch(
                repo,
                values.newName.toLowerCase(),
                values.from.name,
                await commit.getName(),
            )
            await updateBranches()
            helpers.resetForm()
        } catch (e: any) {
            console.error(e)
            toast.error(e.message)
        }
    }

    /** Delete branch */
    const onBranchDelete = async (name: string) => {
        if (window.confirm(`Delete branch '${name}'?`)) {
            try {
                setBranchesBusy((state) => ({
                    ...state,
                    [name]: { ...state[name], busy: true, delete: true },
                }))

                if (await repo.isBranchProtected(name))
                    throw new Error('Branch is protected')
                if (!repoName) throw new GoshError(EGoshError.NO_REPO)
                if (!wallet) throw new GoshError(EGoshError.NO_WALLET)

                await wallet.deleteBranch(repo, name)
                await updateBranches()
            } catch (e: any) {
                setBranchesBusy((state) => ({
                    ...state,
                    [name]: { ...state[name], busy: false, delete: false },
                }))
                console.error(e)
                toast.error(e.message)
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
                {wallet?.isDaoParticipant && (
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
                                to={`/${daoName}/${repoName}/tree/${branch.name}`}
                                className="hover:underline"
                            >
                                {branch.name}
                            </Link>
                        </div>
                        <div>
                            {wallet?.isDaoParticipant && (
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
                                            smvBalance.smvBusy ||
                                            branchesBusy[branch.name]?.busy
                                        }
                                    >
                                        {branchesBusy[branch.name]?.lock ? (
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
                                            branchesBusy[branch.name]?.busy ||
                                            ['main', 'master'].indexOf(branch.name) >= 0
                                        }
                                    >
                                        {branchesBusy[branch.name]?.delete ? (
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

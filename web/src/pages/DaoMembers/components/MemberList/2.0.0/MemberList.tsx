import { Field, Form, Formik } from 'formik'
import { TDao, TDaoMemberDetails, useDaoMemberSetAllowance } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { ToastError } from '../../../../../components/Toast'
import { Button } from '../../../../../components/Form'
import { FormikTextarea } from '../../../../../components/Formik'
import Loader from '../../../../../components/Loader'
import DaoMemberListItem from './MemberListItem'

type TDaoMemeberListProps = {
    dao: {
        details: TDao
        adapter: IGoshDaoAdapter
    }
    members: {
        isFetching: boolean
        items: TDaoMemberDetails[]
        hasNext: boolean
        search: string
        setSearch: React.Dispatch<React.SetStateAction<string>>
        getMore: () => void
    }
    removal: {
        remove: (username: string[]) => Promise<void>
        isFetching: (username: string) => boolean
    }
}

type TAllowanceFormValues = {
    items: (TDaoMemberDetails & { _allowance?: number })[]
    comment?: string
}

const DaoMemeberList = (props: TDaoMemeberListProps) => {
    const { dao, members, removal } = props
    const navigate = useNavigate()
    const updateAllowance = useDaoMemberSetAllowance(dao.adapter)
    const { isFetching, items } = members

    const onDelete = async (username: string) => {
        if (window.confirm('Delete member?')) {
            try {
                await removal.remove([username])
                navigate(`/o/${dao.details.name}/events`)
            } catch (e: any) {
                console.error(e.message)
                toast.error(<ToastError error={e} />)
            }
        }
    }

    const onSubmitAllowance = async (values: TAllowanceFormValues) => {
        try {
            await updateAllowance(
                values.items.map((item) => ({
                    ...item,
                    allowance: parseInt((item.allowance || 0).toString()),
                    _allowance: parseInt((item._allowance || 0).toString()),
                })),
                values.comment,
            )
            navigate(`/o/${dao.details.name}/events`)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <Formik
            initialValues={{
                items: items.map((item) => ({ ...item, _allowance: item.allowance })),
            }}
            onSubmit={onSubmitAllowance}
            enableReinitialize
        >
            {({ values, isSubmitting }) => (
                <Form>
                    <table className="w-full">
                        <thead>
                            <tr className="text-gray-7c8db5 text-left text-xs">
                                <th className="font-normal px-3 py-2 w-4/12">name</th>
                                <th className="font-normal px-3 py-2">allowance</th>
                                <th className="font-normal px-3 py-2 w-3/12">profile</th>
                                <th className="font-normal px-3 py-2 w-3/12">wallet</th>
                                <th className="font-normal px-3 py-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {isFetching && (
                                <tr className="text-gray-606060 text-sm">
                                    <td colSpan={5} className="px-3 py-2">
                                        <Loader>Loading members...</Loader>
                                    </td>
                                </tr>
                            )}

                            {values.items.map((item, index) => (
                                <DaoMemberListItem
                                    key={index}
                                    index={index}
                                    item={item}
                                    owner={dao.details.owner}
                                    isAuthMember={dao.details.isAuthMember}
                                    isFetching={removal.isFetching(item.name)}
                                    onDelete={onDelete}
                                />
                            ))}
                        </tbody>
                    </table>

                    {dao.details.isAuthMember && (
                        <div className="mt-6 px-3 pb-5 w-1/2">
                            <h3 className="text-xl font-medium">Comment changes</h3>

                            <div className="mt-6">
                                <Field
                                    name="comment"
                                    component={FormikTextarea}
                                    placeholder="Write a description to changes in members allowance"
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className="mt-6">
                                <Button
                                    type="submit"
                                    isLoading={isSubmitting}
                                    disabled={isSubmitting}
                                >
                                    Save changes and create proposal
                                </Button>
                            </div>
                        </div>
                    )}
                </Form>
            )}
        </Formik>
    )
}

export default DaoMemeberList

import Alert from '../../../../../components/Alert'
import { useErrorBoundary, withErrorBoundary } from 'react-error-boundary'
import classNames from 'classnames'
import { useEffect } from 'react'
import { ListItem, ListItemHeader, ListItemSkeleton } from './ListItem'
import { TDaoMemberListItem } from '../../../../types/dao.types'
import { Field, Form, Formik } from 'formik'
import yup from '../../../../yup-extended'
import {
    useDao,
    useDaoMember,
    useDaoMemberList,
    useUpdateDaoMember,
} from '../../../../hooks/dao.hooks'
import { FormikTextarea } from '../../../../../components/Formik'
import { Button } from '../../../../../components/Form'
import { useNavigate } from 'react-router-dom'

type TUpdateFormValues = {
    items: (TDaoMemberListItem & { _allowance: string; _balance: string })[]
    comment?: string
}

type TListBoundaryInnerProps = React.HTMLAttributes<HTMLDivElement> & {
    search: string
}

const ListBoundaryInner = (props: TListBoundaryInnerProps) => {
    const { className, search } = props
    const { showBoundary } = useErrorBoundary()
    const navigate = useNavigate()
    const dao = useDao()
    const members = useDaoMemberList({ search })
    const member = useDaoMember()
    const { updateMember } = useUpdateDaoMember()

    const onUpdateMember = async (values: TUpdateFormValues) => {
        try {
            const items = values.items.map((item) => ({
                username: item.username,
                balance: parseInt(item.balance.toString()),
                _balance: parseInt(item._balance),
                allowance: parseInt(item.allowance.toString()),
                _allowance: parseInt(item._allowance),
            }))
            await updateMember(items, values.comment)
            navigate(`/o/${dao.details.name}/events`)
        } catch (e: any) {
            console.error(e.message)
        }
    }

    useEffect(() => {
        if (members.error) {
            showBoundary(members.error)
        }
    }, [members.error])

    return (
        <div
            className={classNames(
                'border rounded-xl px-1 py-2 overflow-hidden',
                className,
            )}
        >
            {members.isFetching && !members.items.length && <ListItemSkeleton />}

            <Formik
                initialValues={{
                    items: members.items.map((item) => ({
                        ...item,
                        _allowance: item.allowance.toString(),
                        _balance: item.balance.toString(),
                    })),
                    comment: '',
                }}
                validationSchema={yup.object().shape({
                    comment: yup.string().required(),
                    items: yup.array().of(
                        yup.object({
                            username: yup.string().required(),
                            allowance: yup
                                .number()
                                .integer()
                                .required('Field is required'),
                            balance: yup
                                .number()
                                .integer()
                                .positive()
                                .required('Field is required'),
                        }),
                    ),
                })}
                onSubmit={onUpdateMember}
                enableReinitialize
            >
                {({ values, isSubmitting }) => (
                    <Form>
                        {!!values.items.length && (
                            <div className="divide-y divide-gray-e6edff">
                                <ListItemHeader />
                                {values.items.map((item, index) => (
                                    <ListItem key={index} item={item} index={index} />
                                ))}
                            </div>
                        )}

                        {members.hasNext && (
                            <div className="text-center mt-8">
                                <Button
                                    type="button"
                                    className="w-full md:w-auto"
                                    disabled={members.isFetching}
                                    isLoading={members.isFetching}
                                    onClick={members.getNext}
                                    test-id="btn-daomembers-more"
                                >
                                    Load more
                                </Button>
                            </div>
                        )}

                        {member.isMember && (
                            <div className="mt-8 px-3 pb-5 lg:w-1/2">
                                <h3 className="text-xl font-medium">Comment changes</h3>

                                <div className="mt-4">
                                    <Field
                                        name="comment"
                                        component={FormikTextarea}
                                        placeholder="Write a description to changes in members allowance"
                                        maxRows={5}
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div className="mt-4">
                                    <Button
                                        type="submit"
                                        className="w-full lg:w-auto"
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
        </div>
    )
}

const ListBoundary = withErrorBoundary(ListBoundaryInner, {
    fallbackRender: ({ error }) => (
        <Alert variant="danger">
            <h3 className="font-medium">Fetch DAO members error</h3>
            <div>{error.message}</div>
        </Alert>
    ),
})

export { ListBoundary }

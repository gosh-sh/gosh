import { Field, Form, Formik, FormikHelpers } from 'formik'
import { toast } from 'react-toastify'
import Spinner from '../../components/Spinner'
import { useDaoMemberCreate } from 'react-gosh'
import { TextareaField } from '../../components/Formik'
import ToastError from '../../components/Error/ToastError'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { useNavigate, useParams } from 'react-router-dom'

type TMemberFormValues = {
    members: string
}

type TDaoMemberFormProps = {
    dao: IGoshDaoAdapter
}

const DaoMemberForm = (props: TDaoMemberFormProps) => {
    const { dao } = props
    const { daoName } = useParams()
    const navigate = useNavigate()
    const createDaoMember = useDaoMemberCreate(dao)

    const onCreateMember = async (
        values: TMemberFormValues,
        helpers: FormikHelpers<any>,
    ) => {
        try {
            await createDaoMember(values.members.split('\n'))
            helpers.resetForm()
            navigate(`/o/${daoName}/events`)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <>
            <Formik initialValues={{ members: '' }} onSubmit={onCreateMember}>
                {({ values, isSubmitting }) => (
                    <Form>
                        <div className="mb-4">
                            <Field
                                label="Add members"
                                name="members"
                                component={TextareaField}
                                inputProps={{
                                    placeholder: 'Username(s)',
                                    autoComplete: 'off',
                                    disabled: isSubmitting,
                                    rows: 5,
                                }}
                                help="Put each @username from new line"
                            />
                        </div>

                        <button
                            type="submit"
                            className="!block btn btn--body px-3 py-3 w-full sm:w-auto sm:mx-auto"
                            disabled={isSubmitting || !values.members.length}
                        >
                            {isSubmitting && <Spinner className="mr-3" size={'lg'} />}
                            Add members
                        </button>
                    </Form>
                )}
            </Formik>
        </>
    )
}

export default DaoMemberForm

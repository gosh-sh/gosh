import { Field, Form, Formik, FormikHelpers } from 'formik'
import { toast } from 'react-toastify'
import Spinner from '../../components/Spinner'
import DaoMemberCreateProgress from './MemberCreateProgress'
import { useDaoMemberCreate } from 'react-gosh'
import TextareaField from '../../components/FormikForms/TextareaField'
import ToastError from '../../components/Error/ToastError'

type TMemberFormValues = {
    members: string
}

const DaoMemberForm = () => {
    const { progress, createMember } = useDaoMemberCreate()

    const onCreateMember = async (
        values: TMemberFormValues,
        helpers: FormikHelpers<any>,
    ) => {
        try {
            await createMember(values.members.split('\n'))
            helpers.resetForm()
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
                                    placeholder: "Members' public keys",
                                    autoComplete: 'off',
                                    disabled: isSubmitting,
                                    rows: 5,
                                }}
                                help="Put each public key (0x...) from new line"
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

            <DaoMemberCreateProgress className="mt-4" progress={progress} />
        </>
    )
}

export default DaoMemberForm

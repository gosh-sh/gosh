import { faTrashAlt } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Field, FieldArray, Form, Formik, FormikHelpers, FormikProps } from 'formik'
import { toast } from 'react-toastify'
import * as Yup from 'yup'
import TextField from '../../components/FormikForms/TextField'
import Spinner from '../../components/Spinner'
import DaoMemberCreateProgress from './MemberCreateProgress'
import { useDaoMemberCreate } from 'react-gosh'

type TParticipantFormValues = {
    pubkey: string[]
}

const PubkeyFieldArray = (props: FormikProps<{ pubkey: never[] }>) => {
    const { values, isSubmitting, touched, errors } = props

    return (
        <FieldArray
            name="pubkey"
            render={({ push, remove }) => (
                <>
                    {values.pubkey.map((_, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between gap-x-3 mb-2"
                        >
                            <div className="grow">
                                <Field
                                    name={`pubkey.${index}`}
                                    component={TextField}
                                    inputProps={{
                                        className: 'w-full',
                                        placeholder: 'Participant public key',
                                        autoComplete: 'off',
                                        disabled: isSubmitting,
                                    }}
                                />
                            </div>
                            <button
                                className="btn btn--body px-3.5 py-3"
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => remove(index)}
                            >
                                <FontAwesomeIcon icon={faTrashAlt} />
                            </button>
                        </div>
                    ))}

                    <button
                        className="!block btn btn--body !font-normal text-sm px-4 py-1.5 w-full sm:w-auto sm:ml-auto"
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => push('')}
                    >
                        Add participant
                    </button>

                    {touched.pubkey && errors.pubkey && (
                        <div className="text-red-dd3a3a text-sm mt-1 text-center">
                            There are empty participants. Either fill them or remove
                        </div>
                    )}
                </>
            )}
        />
    )
}

const DaoMemberForm = () => {
    const { progress, createMember } = useDaoMemberCreate()

    const onCreateParticipant = async (
        values: TParticipantFormValues,
        helpers: FormikHelpers<any>,
    ) => {
        try {
            await createMember(values.pubkey)
            helpers.resetForm()
        } catch (e: any) {
            console.error(e.message)
            toast.error(e.message)
        }
    }

    return (
        <>
            <Formik
                initialValues={{ pubkey: [] }}
                onSubmit={onCreateParticipant}
                validationSchema={Yup.object().shape({
                    pubkey: Yup.array().of(Yup.string().required('Required')),
                })}
            >
                {(formik) => (
                    <Form>
                        <PubkeyFieldArray {...formik} />

                        <button
                            type="submit"
                            className="!block btn btn--body px-3 py-3 mt-4 w-full sm:w-auto sm:mx-auto"
                            disabled={formik.isSubmitting || !formik.values.pubkey.length}
                        >
                            {formik.isSubmitting && (
                                <Spinner className="mr-3" size={'lg'} />
                            )}
                            Save changes
                        </button>
                    </Form>
                )}
            </Formik>

            <DaoMemberCreateProgress className="mt-4" progress={progress} />
        </>
    )
}

export default DaoMemberForm

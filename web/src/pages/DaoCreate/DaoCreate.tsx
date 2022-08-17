import { Field, FieldArray, Form, Formik } from 'formik'
import * as Yup from 'yup'
import TextField from '../../components/FormikForms/TextField'
import { useNavigate } from 'react-router-dom'
import { useRecoilValue } from 'recoil'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrashAlt } from '@fortawesome/free-regular-svg-icons'
import Spinner from '../../components/Spinner'
import { toast } from 'react-toastify'
import { userStateAtom, useDaoCreate } from 'react-gosh'
import DaoCreateProgress from './DaoCreateProgress'

type TFormValues = {
    name: string
    participants: string[]
}

const DaoCreatePage = () => {
    const navigate = useNavigate()
    const { keys } = useRecoilValue(userStateAtom)
    const { createDao, progress } = useDaoCreate()

    const onDaoCreate = async (values: TFormValues) => {
        try {
            await createDao(values.name, values.participants)
            navigate('/account/orgs')
        } catch (e: any) {
            console.error(e.message)
            toast.error(e.message)
        }
    }

    return (
        <div className="container container--full mt-12 mb-5">
            <div className="bordered-block max-w-lg px-7 py-8 mx-auto">
                <h1 className="font-semibold text-2xl text-center mb-8">
                    Create new organization
                </h1>

                <Formik
                    initialValues={{
                        name: '',
                        participants: [keys ? `0x${keys.public}` : ''],
                    }}
                    onSubmit={onDaoCreate}
                    validationSchema={Yup.object().shape({
                        name: Yup.string()
                            .matches(/^[\w-]+$/, 'Name has invalid characters')
                            .max(64, 'Max length is 64 characters')
                            .required('Name is required'),
                        participants: Yup.array().of(Yup.string().required('Required')),
                    })}
                    enableReinitialize
                >
                    {({ values, touched, errors, isSubmitting, setFieldValue }) => (
                        <Form>
                            <div>
                                <Field
                                    name="name"
                                    component={TextField}
                                    inputProps={{
                                        placeholder: 'New organization name',
                                        autoComplete: 'off',
                                        disabled: isSubmitting,
                                        onChange: (e: any) =>
                                            setFieldValue(
                                                'name',
                                                e.target.value.toLowerCase(),
                                            ),
                                    }}
                                />
                            </div>

                            <div className="mt-6">
                                <h3 className="mb-2">Participants</h3>
                                <FieldArray
                                    name="participants"
                                    render={({ push, remove }) => (
                                        <>
                                            {values.participants.map((item, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center justify-between gap-x-3 mb-2"
                                                >
                                                    <div className="grow">
                                                        <Field
                                                            name={`participants.${index}`}
                                                            component={TextField}
                                                            inputProps={{
                                                                className: 'w-full',
                                                                placeholder:
                                                                    'Participant public key',
                                                                autoComplete: 'off',
                                                                disabled:
                                                                    index === 0 ||
                                                                    isSubmitting,
                                                            }}
                                                        />
                                                    </div>
                                                    {index > 0 && (
                                                        <button
                                                            className="btn btn--body px-3.5 py-3"
                                                            type="button"
                                                            disabled={isSubmitting}
                                                            onClick={() => remove(index)}
                                                        >
                                                            <FontAwesomeIcon
                                                                icon={faTrashAlt}
                                                            />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}

                                            <button
                                                className="btn btn--body w-full !font-normal text-sm px-4 py-1.5"
                                                type="button"
                                                disabled={isSubmitting}
                                                onClick={() => push('')}
                                            >
                                                Add participant
                                            </button>

                                            {touched.participants &&
                                                errors.participants && (
                                                    <div className="text-red-dd3a3a text-sm mt-1">
                                                        There are empty participants.
                                                        Either fill them or remove
                                                    </div>
                                                )}
                                        </>
                                    )}
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn btn--body px-3 py-3 w-full mt-8"
                                disabled={isSubmitting}
                            >
                                {isSubmitting && <Spinner className="mr-3" size={'lg'} />}
                                Create organization
                            </button>
                        </Form>
                    )}
                </Formik>

                <DaoCreateProgress progress={progress} className={'mt-4'} />
            </div>
        </div>
    )
}

export default DaoCreatePage

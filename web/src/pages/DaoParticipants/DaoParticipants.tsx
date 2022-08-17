import { faTrashAlt } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Field, FieldArray, Form, Formik, FormikHelpers } from 'formik'
import TextField from '../../components/FormikForms/TextField'
import Spinner from '../../components/Spinner'
import { useDaoMemberList, useDaoMemberCreate } from 'react-gosh'
import * as Yup from 'yup'
import { toast } from 'react-toastify'
import MemberListItem from './MemberListItem'
import DaoMemberCreateProgress from './MemberCreateProgress'

type TParticipantFormValues = {
    pubkey: string[]
}

const DaoParticipantsPage = () => {
    const { items, isFetching, search, setSearch, loadItemDetails } = useDaoMemberList(0)
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
            <div className="input">
                <input
                    className="element !py-1.5"
                    type="search"
                    placeholder="Search member by pubkey..."
                    autoComplete="off"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="mt-8">
                {isFetching && (
                    <div className="text-gray-606060">
                        <Spinner className="mr-3" />
                        Loading participants...
                    </div>
                )}

                <div className="divide-y divide-gray-c4c4c4">
                    {items.map((item, index) => {
                        loadItemDetails(item)
                        return <MemberListItem key={index} item={item} />
                    })}
                </div>
            </div>

            <Formik
                initialValues={{ pubkey: [] }}
                onSubmit={onCreateParticipant}
                validationSchema={Yup.object().shape({
                    pubkey: Yup.array().of(Yup.string().required('Required')),
                })}
            >
                {({ isSubmitting, values, touched, errors }) => (
                    <Form className="mt-8">
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
                                                        placeholder:
                                                            'Participant public key',
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
                                        className="!block btn btn--body !font-normal text-sm px-4 py-1.5
                                        w-full sm:w-auto sm:ml-auto"
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={() => push('')}
                                    >
                                        Add participant
                                    </button>

                                    {touched.pubkey && errors.pubkey && (
                                        <div className="text-red-dd3a3a text-sm mt-1 text-center">
                                            There are empty participants. Either fill them
                                            or remove
                                        </div>
                                    )}
                                </>
                            )}
                        />

                        <button
                            type="submit"
                            className="!block btn btn--body px-3 py-3 mt-4
                            w-full sm:w-auto sm:mx-auto"
                            disabled={isSubmitting || !values.pubkey.length}
                        >
                            {isSubmitting && <Spinner className="mr-3" size={'lg'} />}
                            Save changes
                        </button>
                    </Form>
                )}
            </Formik>

            <DaoMemberCreateProgress className="mt-4" progress={progress} />
        </>
    )
}

export default DaoParticipantsPage

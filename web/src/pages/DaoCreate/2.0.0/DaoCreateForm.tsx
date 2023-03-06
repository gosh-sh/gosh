import { Field, Form, Formik } from 'formik'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { GoshError, useDaoCreate } from 'react-gosh'
import DaoCreateProgress from './DaoCreateProgress'
import ToastError from '../../../components/Error/ToastError'
import yup from '../../../yup-extended'
import { Button } from '../../../components/Form'
import { FormikTextarea, FormikInput, FormikCheckbox } from '../../../components/Formik'
import { useState } from 'react'
import { getIdenticonAvatar } from '../../../helpers'

type TFormValues = {
    name: string
    tags: string
    description: string
    supply: number
    mint: boolean
}

const avatarInitialState = getIdenticonAvatar({ seed: '' }).toDataUriSync()

const DaoCreateForm = () => {
    const navigate = useNavigate()
    const daocreate = useDaoCreate()
    const [avatar, setAvatar] = useState<string>(avatarInitialState)

    const onDaoCreate = async (values: TFormValues) => {
        try {
            if (!daocreate.create) {
                throw new GoshError('Create DAO is not supported')
            }

            const { name, ...rest } = values
            await daocreate.create(name, {
                ...rest,
                tags: rest.tags.trim().split(' '),
            })
            navigate(`/o/${name}`)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <div className="container my-12">
            <div className="max-w-2xl mx-auto">
                <h1 className="font-medium text-3xl text-center mb-14">
                    Set up your organization
                </h1>

                <Formik
                    initialValues={{
                        name: '',
                        tags: '',
                        description: '',
                        supply: 20,
                        mint: true,
                    }}
                    onSubmit={onDaoCreate}
                    validationSchema={yup.object().shape({
                        name: yup
                            .string()
                            .daoname()
                            .daoexists()
                            .required('Name is required'),
                        tags: yup
                            .string()
                            .test(
                                'tags-check',
                                'Maximum number of tags is 3',
                                (value) => {
                                    return !value || value.trim().split(' ').length <= 3
                                },
                            ),
                        supply: yup
                            .number()
                            .integer()
                            .min(20)
                            .required('Field is required'),
                    })}
                    enableReinitialize
                >
                    {({ isSubmitting, values, setFieldValue }) => (
                        <Form>
                            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-8">
                                <div className="w-2/3">
                                    <div>
                                        <Field
                                            label="Name"
                                            name="name"
                                            component={FormikInput}
                                            placeholder="New organization name"
                                            autoComplete="off"
                                            disabled={isSubmitting}
                                            onChange={(e: any) => {
                                                const name = e.target.value.toLowerCase()
                                                setFieldValue('name', name)
                                                setAvatar(
                                                    getIdenticonAvatar({
                                                        seed: name,
                                                    }).toDataUriSync(),
                                                )
                                            }}
                                            test-id="input-dao-name"
                                        />
                                    </div>

                                    <div className="mt-8">
                                        <Field
                                            label="Theme tags"
                                            name="tags"
                                            component={FormikInput}
                                            placeholder="Up to 3 tags"
                                            autoComplete="off"
                                            disabled={isSubmitting}
                                            help="Enter a space after each tag"
                                            test-id="input-dao-tags"
                                        />
                                    </div>

                                    <div className="mt-8">
                                        <Field
                                            label="Description"
                                            name="description"
                                            component={FormikTextarea}
                                            placeholder="Short description"
                                            autoComplete="off"
                                            disabled={isSubmitting}
                                            test-id="input-dao-description"
                                        />
                                    </div>

                                    <div className="mt-8">
                                        <Field
                                            label="Total supply"
                                            name="supply"
                                            component={FormikInput}
                                            placeholder="DAO total supply"
                                            autoComplete="off"
                                            disabled={isSubmitting}
                                            test-id="input-dao-supply"
                                        />
                                    </div>

                                    <div className="mt-8">
                                        <Field
                                            type="checkbox"
                                            label="Allow mint"
                                            name="mint"
                                            component={FormikCheckbox}
                                            inputProps={{
                                                label: 'Allow mint',
                                            }}
                                            disabled={isSubmitting}
                                            help={
                                                values.mint
                                                    ? 'This option enables the DAO token mint'
                                                    : 'If you uncheck this option the DAO token supply will be capped to the number above'
                                            }
                                            helpClassName={
                                                values.mint ? null : 'text-red-ff3b30'
                                            }
                                            test-id="input-dao-mint"
                                        />
                                    </div>
                                </div>

                                <div className="">
                                    <div className="font-medium text-gray-7c8db5 mb-2">
                                        Organization picture
                                    </div>
                                    <div className="w-44 rounded-lg overflow-hidden">
                                        <img src={avatar} className="w-full" alt="" />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8">
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isSubmitting}
                                    isLoading={isSubmitting}
                                    test-id="btn-dao-create"
                                >
                                    Create organization
                                </Button>
                            </div>
                        </Form>
                    )}
                </Formik>

                <DaoCreateProgress progress={daocreate.progress} className={'mt-4'} />
            </div>
        </div>
    )
}

export default DaoCreateForm

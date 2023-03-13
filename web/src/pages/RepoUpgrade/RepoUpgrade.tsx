import { useNavigate, useOutletContext } from 'react-router-dom'
import { TRepoLayoutOutletContext } from '../RepoLayout'
import { Field, Form, Formik } from 'formik'
import { toast } from 'react-toastify'
import { ToastError } from '../../components/Toast'
import { useRepoUpgrade } from 'react-gosh'
import yup from '../../yup-extended'
import { Button } from '../../components/Form'

type TFormValues = {
    version: string
}

const RepoUpgradePage = () => {
    const navigate = useNavigate()
    const { dao, repository } = useOutletContext<TRepoLayoutOutletContext>()
    const { versions, upgrade: upgradeRepository } = useRepoUpgrade(
        dao.adapter,
        repository.adapter,
    )

    const onDaoUpgrade = async (values: TFormValues) => {
        try {
            await upgradeRepository(dao.details.name, values.version)
            if (dao.details.version === '1.0.0') {
                navigate(`/o/${dao.details.name}`)
            } else {
                navigate(`/o/${dao.details.name}/events`)
            }
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <div className="bordered-block px-7 py-8">
            <h3 className="text-lg font-semibold">Upgrade repository</h3>
            <p className="mb-3">Upgrade repository to newer version</p>

            {!versions?.length && (
                <p className="text-rose-600 mb-2">
                    Repository can not be upgraded: repository version equals to DAO
                    version
                </p>
            )}

            <Formik
                initialValues={{
                    version: versions ? versions[0] : '',
                }}
                onSubmit={onDaoUpgrade}
                validationSchema={yup.object().shape({
                    version: yup.string().required('Version is required'),
                })}
                enableReinitialize
            >
                {({ isSubmitting }) => (
                    <Form className="flex flex-wrap items-baseline gap-3">
                        <div>
                            <Field
                                name="version"
                                component={'select'}
                                className="px-2 py-1 rounded-md border focus:outline-none"
                                disabled={isSubmitting || !versions?.length}
                            >
                                {versions?.map((version, index) => (
                                    <option key={index} value={version}>
                                        {version}
                                    </option>
                                ))}
                            </Field>
                        </div>

                        <Button
                            type="submit"
                            disabled={isSubmitting || !versions?.length}
                            isLoading={isSubmitting}
                        >
                            Upgrade
                        </Button>
                    </Form>
                )}
            </Formik>
        </div>
    )
}

export default RepoUpgradePage

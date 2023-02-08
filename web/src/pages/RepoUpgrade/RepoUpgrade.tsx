import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { TRepoLayoutOutletContext } from '../RepoLayout'
import Spinner from '../../components/Spinner'
import { Field, Form, Formik } from 'formik'
import * as Yup from 'yup'
import { toast } from 'react-toastify'
import ToastError from '../../components/Error/ToastError'
import { useRepoUpgrade } from 'react-gosh'

type TFormValues = {
    version: string
}

const RepoUpgradePage = () => {
    const navigate = useNavigate()
    const { daoName } = useParams()
    const { dao, repository } = useOutletContext<TRepoLayoutOutletContext>()
    const { versions, upgrade: upgradeRepository } = useRepoUpgrade(
        dao.adapter,
        repository.adapter,
    )

    const onDaoUpgrade = async (values: TFormValues) => {
        try {
            await upgradeRepository(dao.details.name, values.version)
            navigate(`/o/${daoName}`)
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
                <p className="text-rose-600">
                    Repository can not be upgraded: repository version equals to DAO
                    version
                </p>
            )}

            <Formik
                initialValues={{
                    version: versions ? versions[0] : '',
                }}
                onSubmit={onDaoUpgrade}
                validationSchema={Yup.object().shape({
                    version: Yup.string().required('Version is required'),
                })}
                enableReinitialize
            >
                {({ isSubmitting }) => (
                    <Form className="flex flex-wrap items-baseline gap-3">
                        <div>
                            <Field
                                name="version"
                                component={'select'}
                                className="px-2 py-2 rounded-md border focus:outline-none"
                                disabled={isSubmitting || !versions?.length}
                            >
                                {versions?.map((version, index) => (
                                    <option key={index} value={version}>
                                        {version}
                                    </option>
                                ))}
                            </Field>
                        </div>

                        <button
                            type="submit"
                            className="btn btn--body px-3 py-2"
                            disabled={isSubmitting || !versions?.length}
                        >
                            {isSubmitting && <Spinner className="mr-3" size={'lg'} />}
                            Upgrade
                        </button>
                    </Form>
                )}
            </Formik>
        </div>
    )
}

export default RepoUpgradePage

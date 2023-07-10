import { Field, Form, Formik } from 'formik'
import { useNavigate, useParams } from 'react-router-dom'
import { useUpgradeDao } from '../../hooks/dao.hooks'
import yup from '../../yup-extended'
import { FormikSelect, FormikTextarea } from '../../../components/Formik'
import { Button } from '../../../components/Form'
import { ToastStatus } from '../../../components/Toast'
import Alert from '../../../components/Alert'
import { DISABLED_VERSIONS } from '../../../constants'

type TFormValues = {
    version: string
    comment: string
}

const DaoUpgradePage = () => {
    const { daoname } = useParams()
    const navigate = useNavigate()
    const { versions, upgrade, status } = useUpgradeDao()

    const onDaoUpgrade = async (values: TFormValues) => {
        try {
            const comment = [new Date().toLocaleString(), values.comment]
                .filter((i) => !!i)
                .join('\n')
            await upgrade(values.version, comment)
            navigate(`/o/${daoname}/events`)
        } catch (e: any) {
            console.error(e.message)
        }
    }

    return (
        <div>
            <h3 className="text-xl font-medium mb-4">Upgrade DAO</h3>

            {!versions?.length && (
                <Alert variant="warning" className="mb-4">
                    DAO can not be upgraded: there are no versions ahead
                </Alert>
            )}

            <Formik
                initialValues={{
                    version: versions
                        ? versions
                              .filter((v) => DISABLED_VERSIONS.indexOf(v) < 0)
                              .slice(-1)[0]
                        : '',
                    comment: '',
                }}
                onSubmit={onDaoUpgrade}
                validationSchema={yup.object().shape({
                    version: yup.string().required('Version is required'),
                    comment: yup.string().required('Field is required'),
                })}
                enableReinitialize
            >
                {({ isSubmitting }) => (
                    <Form>
                        <p className="mb-3 text-gray-7c8db5 text-sm">
                            Upgrade DAO to newer version
                        </p>
                        <div>
                            <Field
                                name="version"
                                component={FormikSelect}
                                disabled={isSubmitting || !versions?.length}
                            >
                                {versions?.map((version, index) => (
                                    <option
                                        key={index}
                                        value={version}
                                        disabled={DISABLED_VERSIONS.indexOf(version) >= 0}
                                    >
                                        {version}
                                        {DISABLED_VERSIONS.indexOf(version) >= 0 &&
                                            ' (Not available)'}
                                    </option>
                                ))}
                            </Field>
                        </div>

                        <div className="mt-4">
                            <Field
                                name="comment"
                                component={FormikTextarea}
                                disabled={isSubmitting || !versions?.length}
                                placeholder="Leave comment"
                                maxRows={8}
                            />
                        </div>

                        <div className="mt-4">
                            <Button
                                type="submit"
                                disabled={isSubmitting || !versions?.length}
                                isLoading={isSubmitting}
                            >
                                Create proposal for DAO upgrade
                            </Button>
                        </div>
                    </Form>
                )}
            </Formik>

            <ToastStatus status={status} />
        </div>
    )
}

export default DaoUpgradePage

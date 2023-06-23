import { Field, Form, Formik } from 'formik'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useDaoUpgrade } from 'react-gosh'
import { ToastError } from '../../components/Toast'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import { FormikSelect, FormikTextarea } from '../../components/Formik'
import { Button } from '../../components/Form'
import yup from '../../yup-extended'
import Alert from '../../components/Alert/Alert'
import { DISABLED_VERSIONS } from '../../helpers'

type TFormValues = {
    version: string
    comment: string
}

const DaoUpgradePage = () => {
    const { daoName } = useParams()
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const navigate = useNavigate()
    const { versions, upgrade: upgradeDao } = useDaoUpgrade(dao.adapter)

    const onDaoUpgrade = async (values: TFormValues) => {
        try {
            const comment = [new Date().toLocaleString(), values.comment]
                .filter((i) => !!i)
                .join('\n')
            await upgradeDao(values.version, comment)
            navigate(`/o/${daoName}/events`)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <div>
            <h3 className="text-xl font-medium mb-4">Upgrade DAO</h3>

            {!versions?.length && (
                <Alert variant="danger" className="mb-4">
                    DAO can not be upgraded: there are no versions ahead
                </Alert>
            )}
            {!dao.details.isUpgraded && (
                <Alert variant="danger" className="mb-4">
                    You should complete current DAO upgrade process to upgrade to another
                    version
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
                                disabled={
                                    isSubmitting ||
                                    !versions?.length ||
                                    !dao.details.isUpgraded
                                }
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
                                disabled={
                                    isSubmitting ||
                                    !versions?.length ||
                                    !dao.details.isUpgraded
                                }
                                placeholder="Leave comment (optional)"
                            />
                        </div>

                        <div className="mt-4">
                            <Button
                                type="submit"
                                disabled={
                                    isSubmitting ||
                                    !versions?.length ||
                                    !dao.details.isUpgraded
                                }
                                isLoading={isSubmitting}
                            >
                                Create proposal for DAO upgrade
                            </Button>
                        </div>
                    </Form>
                )}
            </Formik>
        </div>
    )
}

export default DaoUpgradePage

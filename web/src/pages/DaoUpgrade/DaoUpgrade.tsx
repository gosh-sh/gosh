import { Field, Form, Formik } from 'formik'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useDaoUpgrade } from 'react-gosh'
import ToastError from '../../components/Error/ToastError'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import { FormikSelect } from '../../components/Formik'
import { Button } from '../../components/Form'
import yup from '../../yup-extended'

type TFormValues = {
    version: string
}

const DaoUpgradePage = () => {
    const { daoName } = useParams()
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const navigate = useNavigate()
    const { versions, upgrade: upgradeDao } = useDaoUpgrade(dao.adapter)

    const onDaoUpgrade = async (values: TFormValues) => {
        try {
            await upgradeDao(values.version)
            navigate(`/o/${daoName}/events`)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <div>
            <h3 className="text-xl font-medium mb-4">Upgrade DAO</h3>
            <p className="mb-3 text-gray-7c8db5 text-sm">Upgrade DAO to newer version</p>

            {!versions?.length && (
                <p className="text-red-ff3b30 text-sm">
                    DAO can not be upgraded: there are no versions ahead
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
                                component={FormikSelect}
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

export default DaoUpgradePage

import { Field, Form, Formik } from 'formik'
import * as Yup from 'yup'
import { useNavigate, useOutletContext } from 'react-router-dom'
import Spinner from '../../components/Spinner'
import { toast } from 'react-toastify'
import { useDaoUpgrade } from 'react-gosh'
import ToastError from '../../components/Error/ToastError'
import { TDaoLayoutOutletContext } from '../DaoLayout'

type TFormValues = {
    version: string
}

const DaoUpgradePage = () => {
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const navigate = useNavigate()
    const { versions, upgrade: upgradeDao } = useDaoUpgrade(dao.adapter)

    const onDaoUpgrade = async (values: TFormValues) => {
        try {
            await upgradeDao(values.version)
            navigate('/a/orgs')
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <div>
            <h3 className="text-lg font-semibold">Upgrade DAO</h3>
            <p className="mb-3">Upgrade DAO to newer version</p>
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
                                disabled={isSubmitting}
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
                            disabled={isSubmitting}
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

export default DaoUpgradePage

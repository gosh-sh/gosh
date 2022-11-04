import { Field, Form, Formik } from 'formik'
import * as Yup from 'yup'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import Spinner from '../../components/Spinner'
import { toast } from 'react-toastify'
import { useDaoUpgrade } from 'react-gosh'
import ToastError from '../../components/Error/ToastError'
import { TDaoLayoutOutletContext } from '../DaoLayout'

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
            <h3 className="text-lg font-semibold">Upgrade DAO</h3>
            <p className="mb-3">Upgrade DAO to newer version</p>

            {!versions?.length && (
                <p className="text-rose-600">
                    DAO can not be upgraded: there are no versions ahead
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

export default DaoUpgradePage

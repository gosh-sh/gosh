import { Field, Form, Formik } from 'formik'
import { Navigate, useNavigate, useOutletContext } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useDaoMint, useDaoMintDisable } from 'react-gosh'
import ToastError from '../../components/Error/ToastError'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import yup from '../../yup-extended'
import { FormikCheckbox, FormikInput, FormikTextarea } from '../../components/Formik'
import { Button } from '../../components/Form'

type TSupplyFormValues = {
    amount: number
    comment: string
}

type TMintFormValues = {
    mint: boolean
    comment: string
}

const DaoSetupPage = () => {
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const mint = useDaoMint(dao.adapter)
    const mintDisable = useDaoMintDisable(dao.adapter)
    const navigate = useNavigate()

    const onMint = async (values: TSupplyFormValues) => {
        try {
            await mint(values.amount, values.comment)
            navigate(`/o/${dao.details.name}/events`)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    const onMintDisable = async (values: TMintFormValues) => {
        try {
            await mintDisable(values.comment)
            navigate(`/o/${dao.details.name}/events`)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    if (dao.details.version === '1.0.0') {
        return <Navigate to={`/o/${dao.details.name}`} />
    }
    return (
        <>
            <h3 className="text-xl font-medium mb-10">Token setup</h3>

            <div className="divide-y divide-gray-e6edff">
                <div className="pb-10">
                    <Formik
                        initialValues={{ mint: dao.details.isMintOn, comment: '' }}
                        onSubmit={onMintDisable}
                    >
                        {({ isSubmitting, values }) => (
                            <Form>
                                <div>
                                    <Field
                                        type="checkbox"
                                        label="Allow mint"
                                        name="mint"
                                        component={FormikCheckbox}
                                        disabled={isSubmitting || !dao.details.isMintOn}
                                        inputProps={{
                                            className: 'inline-block',
                                            label: 'Allow mint',
                                        }}
                                        help={
                                            values.mint
                                                ? 'This option enables the DAO token mint'
                                                : 'If you uncheck this option, the DAO will never be able to mint tokens'
                                        }
                                        helpClassName={
                                            values.mint ? null : 'text-red-ff3b30'
                                        }
                                    />
                                </div>
                                {dao.details.isMintOn && (
                                    <>
                                        <div className="mt-4">
                                            <Field
                                                name="comment"
                                                component={FormikTextarea}
                                                disabled={isSubmitting}
                                                placeholder="Leave your comment"
                                            />
                                        </div>
                                        <div className="mt-4">
                                            <Button
                                                type="submit"
                                                isLoading={isSubmitting}
                                                disabled={isSubmitting || values.mint}
                                            >
                                                Save changes and start proposal
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </Form>
                        )}
                    </Formik>
                </div>

                <div className="pt-10">
                    <Formik
                        initialValues={{ amount: 0, comment: '' }}
                        validationSchema={yup.object().shape({
                            amount: yup.number().integer().positive().required(),
                        })}
                        onSubmit={onMint}
                    >
                        {({ isSubmitting }) => (
                            <Form>
                                <div className="w-1/3">
                                    <Field
                                        label="Mint tokens"
                                        name="amount"
                                        component={FormikInput}
                                        disabled={isSubmitting || !dao.details.isMintOn}
                                        placeholder="Amount to mint"
                                        autoComplete="off"
                                        help={`Current total supply is ${dao.details.supply.total}`}
                                    />
                                </div>
                                {dao.details.isMintOn && (
                                    <>
                                        <div className="mt-4">
                                            <Field
                                                name="comment"
                                                component={FormikTextarea}
                                                disabled={isSubmitting}
                                                placeholder="Leave your comment"
                                            />
                                        </div>
                                        <div className="mt-4">
                                            <Button
                                                type="submit"
                                                isLoading={isSubmitting}
                                                disabled={isSubmitting}
                                            >
                                                Save changes and start proposal
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </Form>
                        )}
                    </Formik>
                </div>
            </div>
        </>
    )
}

export default DaoSetupPage

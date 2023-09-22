import { faRotateRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect } from 'react'
import Spinner from '../../../../../components/Spinner'
import ListEmpty from '../ListEmpty'
import OAuthProfile from '../OAuthProfile'
import PreviousStep from '../PreviousStep'
import { Formik, Form, Field } from 'formik'
import { FormikInput } from '../../../../../components/Formik'
import yup from '../../../../yup-extended'
import { TOAuthSession } from '../../../../types/oauth.types'
import { useOnboardingData } from '../../../../hooks/onboarding.hooks'
import { Button } from '../../../../../components/Form'
import { toast } from 'react-toastify'
import { ToastError } from '../../../../../components/Toast'
import OrganizationListItem from './ListItem'

type TGithubOrganizationsProps = {
    oauth: TOAuthSession
    signoutOAuth(): Promise<void>
}

const GithubOrganizations = (props: TGithubOrganizationsProps) => {
    const { oauth, signoutOAuth } = props
    const { data, organizations, repositories, updateData, getOrganizations, upload } =
        useOnboardingData(oauth)

    const onBackClick = () => {
        updateData({ step: 'invites' })
    }

    const onFormSubmit = async (values: { email_other: string }) => {
        try {
            await upload({ email: values.email_other })
        } catch (e: any) {
            console.error(e.message)
        }
    }

    useEffect(() => {
        const _getOrganizations = async () => {
            try {
                await getOrganizations()
            } catch (e: any) {
                console.error(e.message)
                toast.error(<ToastError error={e} />)
                await signoutOAuth()
            }
        }

        _getOrganizations()
    }, [])

    if (!oauth.session) {
        return null
    }
    return (
        <div className="flex flex-wrap items-start">
            <div className="basis-1/2 p-0 lg:p-16">
                <div className="mb-6">
                    <OAuthProfile oauth={oauth} onSignout={signoutOAuth} />
                </div>

                <div className="mb-8 text-3xl font-medium">
                    Select GitHub organization to
                    <span className="text-blue-2b89ff">
                        &nbsp;create your DAO on GOSH
                    </span>
                </div>

                <Formik
                    initialValues={{
                        email_other: data.emailOther,
                    }}
                    validationSchema={yup.object().shape({
                        email_other: yup.string().email(),
                    })}
                    onSubmit={onFormSubmit}
                    enableReinitialize
                >
                    {({ isSubmitting }) => (
                        <Form>
                            <div className="mb-8">
                                <Field
                                    name="email_other"
                                    type="email"
                                    component={FormikInput}
                                    autoComplete="off"
                                    placeholder="Email for notifications"
                                    disabled={isSubmitting}
                                    help="You can input another email to send notifications to"
                                />
                            </div>

                            <div className="text-center">
                                <Button
                                    type="submit"
                                    size="xl"
                                    disabled={
                                        !repositories.selected.length || isSubmitting
                                    }
                                    isLoading={isSubmitting}
                                >
                                    Upload
                                </Button>
                            </div>
                        </Form>
                    )}
                </Formik>
            </div>

            <div className="grow basis-0">
                <div className="text-end text-gray-7c8db5">
                    <Button
                        type="button"
                        variant="custom"
                        disabled={organizations.isFetching}
                        onClick={getOrganizations}
                    >
                        {organizations.isFetching ? (
                            <Spinner size="xs" />
                        ) : (
                            <FontAwesomeIcon icon={faRotateRight} />
                        )}
                        <span className="ml-2">Refresh</span>
                    </Button>
                </div>

                {!organizations.isFetching && !organizations.items.length && (
                    <ListEmpty>
                        You should have at least one organization on GitHub
                    </ListEmpty>
                )}

                <div className="flex flex-col gap-6">
                    {organizations.items.map((item, index) => (
                        <OrganizationListItem
                            key={index}
                            oauth={oauth}
                            item={item}
                            signoutOAuth={signoutOAuth}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

export { GithubOrganizations }

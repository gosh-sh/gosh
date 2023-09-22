import { useState } from 'react'
import { Button } from '../../../../../components/Form'
import DaoInviteListItem from './ListItem'
import { useUserSignup } from '../../../../hooks/user.hooks'
import { Form, Formik } from 'formik'
import { PreviousStep } from '../PreviousStep'

const DaoInvitesForm = () => {
    const { data, submitDaoInvitesStep } = useUserSignup()
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

    const onFormSubmit = async () => {
        try {
            setIsSubmitting(true)
            await submitDaoInvitesStep()
        } catch (e: any) {
            console.error(e.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="flex flex-wrap items-center justify-center gap-14">
            <div className="basis-full lg:basis-4/12 text-center lg:text-start">
                <div className="mb-6">
                    <PreviousStep step="username" disabled={isSubmitting} />
                </div>
                <div className="mb-8 text-3xl font-medium">
                    Accept or decline invitations to the DAO
                </div>
                <Formik initialValues={{}} onSubmit={onFormSubmit}>
                    {({ isSubmitting }) => (
                        <Form>
                            <div className="text-center">
                                <Button
                                    type="submit"
                                    size="xl"
                                    disabled={isSubmitting}
                                    isLoading={isSubmitting}
                                >
                                    Continue
                                </Button>
                            </div>
                        </Form>
                    )}
                </Formik>
            </div>
            <div className="basis-full md:basis-8/12 lg:basis-5/12">
                <div className="flex flex-col gap-6">
                    {data.daoinvites.map((item, index) => (
                        <DaoInviteListItem
                            key={index}
                            item={item}
                            disabled={isSubmitting}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

export { DaoInvitesForm }

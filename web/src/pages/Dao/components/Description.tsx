import { Form, Formik } from 'formik'
import { useCallback, useEffect, useState } from 'react'
import { classNames, TDao } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import BlobPreview from '../../../components/Blob/Preview'
import { ToastError } from '../../../components/Toast'
import { Button } from '../../../components/Form'

type TDaoDescriptionProps = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
    className?: string
}

const DaoDescription = (props: TDaoDescriptionProps) => {
    const { dao, className } = props
    const navigate = useNavigate()
    const [description, setDescription] = useState<{
        isFetching: boolean
        content: string | null
    }>({ isFetching: false, content: null })

    const getDaoDescription = useCallback(async () => {
        setDescription((state) => ({ ...state, isFetching: true }))
        const content = await dao.adapter.getDescription()
        setDescription((state) => ({ ...state, isFetching: false, content }))
    }, [dao.adapter])

    const onSystemRepositoryCreate = async (values: { name: string }) => {
        try {
            await dao.adapter.createRepository({
                name: values.name,
                description: 'DAO system repository',
            })
            navigate(`/o/${dao.details.name}/events`)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    useEffect(() => {
        getDaoDescription()
    }, [getDaoDescription])

    if (dao.details.version === '1.0.0') {
        return null
    }
    if (description.isFetching) {
        return null
    }
    if (!description.content && !dao.details.isAuthMember) {
        return null
    }
    return (
        <div
            className={classNames(
                'border border-gray-e6edff rounded-xl overflow-hidden',
                className,
            )}
        >
            <div className="flex flex-nowrap justify-between p-5 border-b border-gray-e6edff">
                <div className="font-medium">README.md</div>
                {/* <div className="text-gray-7c8db5">
                    <button>Read more</button>
                </div> */}
            </div>

            {!description.content && !dao.details.hasRepoIndex && (
                <div className="text-center text-sm text-gray-53596d p-5">
                    <Formik
                        initialValues={{ name: '_index' }}
                        onSubmit={onSystemRepositoryCreate}
                    >
                        {({ isSubmitting }) => (
                            <Form>
                                <div className="mb-4">
                                    You can add organization description by placing
                                    <br />
                                    readme.md file to main branch of _index repository
                                </div>
                                <Button
                                    type="submit"
                                    isLoading={isSubmitting}
                                    disabled={isSubmitting}
                                >
                                    Create _index repository
                                </Button>
                            </Form>
                        )}
                    </Formik>
                </div>
            )}

            {!description.content && dao.details.hasRepoIndex && (
                <div className="text-center text-sm text-gray-53596d p-5">
                    You can add organization description by placing
                    <br />
                    readme.md file to main branch of{' '}
                    <Link
                        to={`/o/${dao.details.name}/r/_index`}
                        className="text-blue-348eff"
                    >
                        _index
                    </Link>{' '}
                    repository
                </div>
            )}

            {!!description.content && (
                <BlobPreview
                    filename="README.md"
                    value={description.content}
                    className="!p-5"
                />
            )}
        </div>
    )
}

export { DaoDescription }

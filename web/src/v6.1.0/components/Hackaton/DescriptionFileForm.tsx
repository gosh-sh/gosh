import { faList, faPencil } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Field, Form, Formik } from 'formik'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useNavigate } from 'react-router-dom'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import { Button } from '../../../components/Form'
import { FormikTextarea } from '../../../components/Formik'
import { GoshError } from '../../../errors'
import { useDao, useDaoMember } from '../../hooks/dao.hooks'
import { useHackaton, useUpdateHackatonDetails } from '../../hooks/hackaton.hooks'

type DescriptionFileFormProps = {
    filename: string
}

const HackatonDescriptionFileForm = (props: DescriptionFileFormProps) => {
    const { filename } = props
    const navigate = useNavigate()
    const member = useDaoMember()
    const dao = useDao()
    const { data } = useHackaton()
    const { update } = useUpdateHackatonDetails()
    const [edit, setEdit] = useState<boolean>(false)
    const [content, setContent] = useState<string>('')

    const onEditToggle = () => {
        setEdit(!edit)
    }

    const onFormSubmit = async (values: { modified: string }) => {
        try {
            if (!data) {
                throw new GoshError('Value error', 'Hackaton metadata is not loaded yet')
            }

            const { event_address } = await update({
                repo_name: data.name,
                filename,
                content: { original: content, modified: values.modified },
            })
            onEditToggle()
            if (event_address) {
                navigate(`/o/${dao.details.name}/events/${event_address}`)
            }
        } catch (e: any) {
            console.error(e.message)
        }
    }

    useEffect(() => {
        const key = filename.split('.')[0].toLowerCase()
        const description: { [key: string]: string } = { ...data?.metadata.description }
        setContent(description[key])
    }, [filename, data?.metadata.is_fetching])

    return (
        <div className="border border-gray-e6edff rounded-xl overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b border-b-gray-e6edff">
                <div>
                    <FontAwesomeIcon
                        icon={faList}
                        size="xs"
                        className="mr-4 text-gray-7c8db5"
                    />
                    <span className="text-blue-2b89ff font-medium">{filename}</span>
                </div>
                <div>
                    {member.isMember && (
                        <Button
                            variant="custom"
                            className="!p-0 text-gray-7c8db5"
                            onClick={onEditToggle}
                        >
                            <FontAwesomeIcon icon={faPencil} />
                        </Button>
                    )}
                </div>
            </div>

            <AnimatePresence mode="popLayout">
                {!edit ? (
                    <motion.div
                        key="preview"
                        className="p-5 markdown-body"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                        >
                            {content}
                        </ReactMarkdown>
                    </motion.div>
                ) : (
                    <motion.div
                        key="editor"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        <Formik
                            initialValues={{ modified: content }}
                            onSubmit={onFormSubmit}
                        >
                            {({ isSubmitting }) => (
                                <Form>
                                    <Field name="modified" component={FormikTextarea} />
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        isLoading={isSubmitting}
                                    >
                                        Save changes
                                    </Button>
                                </Form>
                            )}
                        </Formik>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export { HackatonDescriptionFileForm }

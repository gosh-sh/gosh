import {
    IconDefinition,
    faChevronDown,
    faList,
    faPencil,
    faTimes,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import classNames from 'classnames'
import { Field, Form, Formik } from 'formik'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useNavigate } from 'react-router-dom'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import { Button } from '../../../components/Form'
import { BaseField } from '../../../components/Formik'
import Skeleton from '../../../components/Skeleton'
import { GoshError } from '../../../errors'
import { html2markdown, markdown2html } from '../../../helpers'
import { useDao, useDaoMember } from '../../hooks/dao.hooks'
import { useHackathon, useUpdateHackathon } from '../../hooks/hackathon.hooks'
import { Editor } from './Editor'

type DescriptionFileFormProps = {
    title: string
    mapping_key: string
    filename: string
    icon?: IconDefinition
    initial_collapsed?: boolean
}

const HackathonDescriptionFileForm = (props: DescriptionFileFormProps) => {
    const {
        title,
        mapping_key,
        filename,
        icon = faList,
        initial_collapsed = false,
    } = props
    const navigate = useNavigate()
    const member = useDaoMember()
    const dao = useDao()
    const { hackathon } = useHackathon()
    const { updateStorageData } = useUpdateHackathon()
    const [edit, setEdit] = useState<boolean>(false)
    const [collapsed, setCollapsed] = useState<boolean>(initial_collapsed)
    const [content, setContent] = useState<{ md: string; html: string }>({
        md: '',
        html: '',
    })
    const formRef = useRef<any>()

    const show_skeleton =
        !hackathon?._rg_fetched ||
        (!hackathon?.storagedata.is_fetched && hackathon?.storagedata.is_fetching)

    const onCollapseToggle = () => {
        setCollapsed(!collapsed)
    }

    const onEditToggle = () => {
        if (!edit) {
            setCollapsed(false)
        }
        setEdit(!edit)
    }

    const onSaveClick = () => {
        formRef.current?.submitForm()
    }

    const onFormSubmit = async (values: { modified: string }) => {
        try {
            if (!hackathon) {
                throw new GoshError('Value error', 'Hackathon metadata is not loaded yet')
            }

            const remarked = await html2markdown(values.modified)
            const { event_address } = await updateStorageData({
                filename,
                content: { original: content.md, modified: remarked },
            })
            onEditToggle()
            if (event_address) {
                navigate(`/o/${dao.details.name}/events/${event_address}`)
            }
        } catch (e: any) {
            console.error(e.message)
        }
    }

    const getContentCallback = useCallback(async () => {
        const mapping: { [key: string]: string } = {
            ...hackathon?.storagedata.description,
        }
        const html = await markdown2html(mapping[mapping_key])
        setContent({ md: mapping[mapping_key], html })
    }, [mapping_key, show_skeleton])

    useEffect(() => {
        getContentCallback()
    }, [getContentCallback])

    return (
        <div className="border border-gray-e6edff rounded-xl overflow-hidden">
            <div
                className={classNames(
                    'p-5 flex items-center justify-between border-b',
                    collapsed ? 'border-b-transparent' : 'border-b-gray-e6edff',
                )}
            >
                <div>
                    <FontAwesomeIcon
                        icon={icon}
                        size="sm"
                        className="mr-4 text-gray-7c8db5"
                    />
                    <span className="text-blue-2b89ff font-medium">{title}</span>
                </div>
                <div className="flex flex-nowrap items-center gap-x-4">
                    {member.isMember && !show_skeleton && hackathon.is_update_enabled && (
                        <>
                            {edit && (
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    disabled={formRef.current?.isSubmitting}
                                    isLoading={formRef.current?.isSubmitting}
                                    onClick={onSaveClick}
                                >
                                    Save
                                </Button>
                            )}
                            <Button
                                variant="custom"
                                className="!p-0 text-gray-7c8db5"
                                disabled={formRef.current?.isSubmitting}
                                onClick={onEditToggle}
                            >
                                <FontAwesomeIcon
                                    icon={!edit ? faPencil : faTimes}
                                    size={!edit ? '1x' : 'lg'}
                                />
                            </Button>
                        </>
                    )}

                    {!edit && (
                        <Button
                            variant="custom"
                            className="!p-0 text-gray-7c8db5"
                            onClick={onCollapseToggle}
                        >
                            <FontAwesomeIcon
                                icon={faChevronDown}
                                className={classNames(
                                    'transition-transform duration-200',
                                    collapsed ? 'rotate-0' : 'rotate-180',
                                )}
                            />
                        </Button>
                    )}
                </div>
            </div>

            {!collapsed && show_skeleton && (
                <Skeleton className="p-5" skeleton={{ height: 40 }}>
                    <rect x="0" y="0" rx="4" ry="4" width="100%" height="10" />
                    <rect x="0" y="15" rx="4" ry="4" width="100%" height="10" />
                    <rect x="0" y="30" rx="4" ry="4" width="100%" height="10" />
                </Skeleton>
            )}

            <AnimatePresence initial={false}>
                {!collapsed && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                    >
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
                                        urlTransform={(value: string) => value}
                                    >
                                        {content.md}
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
                                        innerRef={formRef}
                                        initialValues={{ modified: content.html }}
                                        onSubmit={onFormSubmit}
                                    >
                                        {({ values, setFieldValue }) => (
                                            <Form>
                                                <Field
                                                    name="modified"
                                                    component={BaseField}
                                                >
                                                    <Editor
                                                        className="sun-editor--noborder"
                                                        defaultValue={values.modified}
                                                        disable={
                                                            formRef.current?.isSubmitting
                                                        }
                                                        onChange={(value) => {
                                                            setFieldValue(
                                                                'modified',
                                                                value,
                                                            )
                                                        }}
                                                    />
                                                </Field>
                                            </Form>
                                        )}
                                    </Formik>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export { HackathonDescriptionFileForm }

import classNames from 'classnames'
import { Field, Form, Formik } from 'formik'
import React from 'react'
import { FormikTextarea } from '../../Formik'
import { Button } from '../../Form'

type TLineContentProps = {
    commentsOn?: boolean
    content: string
    showForm: boolean
    showFormDir: 'up' | 'down'
    containerProps?: React.HTMLAttributes<HTMLTableCellElement>
    commentButtonProps?: React.HTMLAttributes<HTMLDivElement>
    onCommentFormReset?(): void
    onCommentFormSubmit?(values: any): void
}

const commentAddImg =
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDIiIGhlaWdodD0iNDIiIHZpZXdCb3g9IjAgMCA0MiA0MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQxLjUgMjFDNDEuNSAzMi4zMjE4IDMyLjMyMTggNDEuNSAyMSA0MS41SDIwLjk2NzhIMjAuOTM1NEgyMC45MDI3SDIwLjg2OTlIMjAuODM2OEgyMC44MDM0SDIwLjc2OTlIMjAuNzM2MUgyMC43MDIxSDIwLjY2NzlIMjAuNjMzNUgyMC41OTg4SDIwLjU2NEgyMC41Mjg5SDIwLjQ5MzZIMjAuNDU4MUgyMC40MjI0SDIwLjM4NjVIMjAuMzUwM0gyMC4zMTRIMjAuMjc3NEgyMC4yNDA3SDIwLjIwMzdIMjAuMTY2NUgyMC4xMjkySDIwLjA5MTZIMjAuMDUzOEgyMC4wMTU5SDE5Ljk3NzdIMTkuOTM5M0gxOS45MDA4SDE5Ljg2MkgxOS44MjMxSDE5Ljc4MzlIMTkuNzQ0NkgxOS43MDUxSDE5LjY2NTRIMTkuNjI1NUgxOS41ODU0SDE5LjU0NTFIMTkuNTA0N0gxOS40NjRIMTkuNDIzMkgxOS4zODIySDE5LjM0MUgxOS4yOTk3SDE5LjI1ODFIMTkuMjE2NEgxOS4xNzQ1SDE5LjEzMjVIMTkuMDkwMkgxOS4wNDc4SDE5LjAwNTJIMTguOTYyNUgxOC45MTk2SDE4Ljg3NjVIMTguODMzMkgxOC43ODk4SDE4Ljc0NjJIMTguNzAyNUgxOC42NTg2SDE4LjYxNDVIMTguNTcwM0gxOC41MjU5SDE4LjQ4MTRIMTguNDM2N0gxOC4zOTE5SDE4LjM0NjlIMTguMzAxN0gxOC4yNTY0SDE4LjIxMUgxOC4xNjU0SDE4LjExOTZIMTguMDczN0gxOC4wMjc3SDE3Ljk4MTVIMTcuOTM1MkgxNy44ODg3SDE3Ljg0MjFIMTcuNzk1M0gxNy43NDg0SDE3LjcwMTRIMTcuNjU0MkgxNy42MDY5SDE3LjU1OTVIMTcuNTEySDE3LjQ2NDNIMTcuNDE2NEgxNy4zNjg1SDE3LjMyMDRIMTcuMjcyMkgxNy4yMjM4SDE3LjE3NTRIMTcuMTI2OEgxNy4wNzgxSDE3LjAyOTJIMTYuOTgwM0gxNi45MzEySDE2Ljg4MkgxNi44MzI3SDE2Ljc4MzNIMTYuNzMzOEgxNi42ODQxSDE2LjYzNDRIMTYuNTg0NUgxNi41MzQ1SDE2LjQ4NDRIMTYuNDM0MkgxNi4zODM5SDE2LjMzMzVIMTYuMjgzSDE2LjIzMjRIMTYuMTgxNkgxNi4xMzA4SDE2LjA3OTlIMTYuMDI4OUgxNS45Nzc4SDE1LjkyNjVIMTUuODc1MkgxNS44MjM4SDE1Ljc3MjNIMTUuNzIwN0gxNS42NjkxSDE1LjYxNzNIMTUuNTY1NEgxNS41MTM1SDE1LjQ2MTVIMTUuNDA5NEgxNS4zNTcySDE1LjMwNDlIMTUuMjUyNUgxNS4yMDAxSDE1LjE0NzZIMTUuMDk1SDE1LjA0MjNIMTQuOTg5NUgxNC45MzY3SDE0Ljg4MzhIMTQuODMwOEgxNC43Nzc4SDE0LjcyNDdIMTQuNjcxNUgxNC42MTgzSDE0LjU2NDlIMTQuNTExNkgxNC40NTgxSDE0LjQwNDZIMTQuMzUxSDE0LjI5NzRIMTQuMjQzN0gxNC4xOUgxNC4xMzYySDE0LjA4MjNIMTQuMDI4NEgxMy45NzQ0SDEzLjkyMDRIMTMuODY2M0gxMy44MTIySDEzLjc1OEgxMy43MDM4SDEzLjY0OTVIMTMuNTk1MkgxMy41NDA4SDEzLjQ4NjRIMTMuNDMySDEzLjM3NzVIMTMuMzIzSDEzLjI2ODRIMTMuMjEzOEgxMy4xNTkxSDEzLjEwNDVIMTMuMDQ5N0gxMi45OTVIMTIuOTQwMkgxMi44ODU0SDEyLjgzMDZIMTIuNzc1N0gxMi43MjA4SDEyLjY2NTlIMTIuNjEwOUgxMi41NTZIMTIuNTAxSDEyLjQ0NTlIMTIuMzkwOUgxMi4zMzU4SDEyLjI4MDhIMTIuMjI1N0gxMi4xNzA2SDEyLjExNTRIMTIuMDYwM0gxMi4wMDUxSDExLjk1SDExLjg5NDhIMTEuODM5NkgxMS43ODQ0SDExLjcyOTJIMTEuNjc0SDExLjYxODhIMTEuNTYzNkgxMS41MDg0SDExLjQ1MzFIMTEuMzk3OUgxMS4zNDI3SDExLjI4NzVIMTEuMjMyM0gxMS4xNzcxSDExLjEyMTlIMTEuMDY2N0gxMS4wMTE1SDEwLjk1NjNIMTAuOTAxMUgxMC44NDZIMTAuNzkwOEgxMC43MzU3SDEwLjY4MDZIMTAuNjI1NUgxMC41NzA0SDEwLjUxNTNIMTAuNDYwM0gxMC40MDUzSDEwLjM1MDNIMTAuMjk1M0gxMC4yNDAzSDEwLjE4NTRIMTAuMTMwNUgxMC4wNzU2SDEwLjAyMDdIOS45NjU5MUg5LjkxMTEySDkuODU2MzZIOS44MDE2M0g5Ljc0NjkzSDkuNjkyMjdIOS42Mzc2NUg5LjU4MzA3SDkuNTI4NTJIOS40NzQwMUg5LjQxOTU1SDkuMzY1MTJIOS4zMTA3NUg5LjI1NjQxSDkuMjAyMTJIOS4xNDc4N0g5LjA5MzY4SDkuMDM5NTNIOC45ODU0M0g4LjkzMTM5SDguODc3NEg4LjgyMzQ1SDguNzY5NTdIOC43MTU3NEg4LjY2MTk3SDguNjA4MjVIOC41NTQ2SDguNTAxSDguNDQ3NDdIOC4zOTRIOC4zNDA1OUg4LjI4NzI1SDguMjMzOTdIOC4xODA3N0g4LjEyNzYzSDguMDc0NTVIOC4wMjE1NUg3Ljk2ODYzSDcuOTE1NzdINy44NjI5OUg3LjgxMDI4SDcuNzU3NjVINy43MDUxSDcuNjUyNjNINy42MDAyM0g3LjU0NzkySDcuNDk1NjlINy40NDM1NEg3LjM5MTQ4SDcuMzM5NUg3LjI4NzYxSDcuMjM1ODFINy4xODQwOUg3LjEzMjQ3SDcuMDgwOTRINy4wMjk0OUg2Ljk3ODE1SDYuOTI2OUg2Ljg3NTc0SDYuODI0NjhINi43NzM3Mkg2LjcyMjg2SDYuNjcyMDlINi42MjE0M0g2LjU3MDg4SDYuNTIwNDJINi40NzAwN0g2LjQxOTgzSDYuMzY5NjlINi4zMTk2N0g2LjI2OTc1SDYuMjE5OTRINi4xNzAyNUg2LjEyMDY2SDYuMDcxMkg2LjAyMTg0SDUuOTcyNjFINS45MjM0OUg1Ljg3NDQ5SDUuODI1NjFINS43NzY4NUg1LjcyODIxSDUuNjc5NjlINS42MzEzSDUuNTgzMDRINS41MzQ5SDUuNDg2ODlINS40MzkwMUg1LjM5MTI2SDUuMzQzNjRINS4yOTYxNUg1LjI0ODhINS4yMDE1OEg1LjE1NDVINS4xMDc1NUg1LjA2MDc0SDUuMDE0MDhINC45Njc1NUg0LjkyMTE2SDQuODc0OTJINC44Mjg4Mkg0Ljc4Mjg2SDQuNzM3MDVINC42OTEzOUg0LjY0NTg4SDQuNjAwNTFINC41NTUzSDQuNTEwMjRINC40NjUzM0g0LjQyMDU3SDQuMzc1OTdINC4zMzE1M0g0LjI4NzI1SDQuMjQzMTJINC4xOTkxNUg0LjE1NTM1SDQuMTExN0g0LjA2ODIySDQuMDI0OTFIMy45ODE3NkgzLjkzODc3SDMuODk1OTZIMy44NTMzMUgzLjgxMDgzSDMuNzY4NTNIMy43MjYzOUgzLjY4NDQzSDMuNjQyNjVIMy42MDEwNEgzLjU1OTYxSDMuNTE4MzVIMy40NzcyOEgzLjQzNjM4SDMuMzk1NjdIMy4zNTUxNEgzLjMxNDhIMy4yNzQ2M0gzLjIzNDY2SDMuMTk0ODdIMy4xNTUyN0gzLjExNTg2SDMuMDc2NjRIMy4wMzc2MkgyLjk5ODc4SDIuOTYwMTRIMi45MjE3SDIuODgzNDVIMi44NDU0SDIuODA3NTRIMi43Njk4OUgyLjczMjQ0SDIuNjk1MTlIMi42NTgxNUgyLjYyMTNIMi41ODQ2N0gyLjU0ODI0SDIuNTEyMDJIMi40NzZIMi40NDAySDIuNDA0NjFIMi4zNjkyM0gyLjMzNDA3SDIuMjk5MTJIMi4yNjQzOEgyLjIyOTg2SDIuMTk1NTdIMi4xNjE0OUgyLjEyNzYzSDIuMDkzOTlIMi4wNjA1N0gyLjAyNzM4SDEuOTk0NDFIMS45NjE2N0gxLjkyOTE2SDEuODk2ODhIMS44NjQ4MkgxLjgzM0gxLjgwMTRIMS43NzAwNEgxLjczODkySDEuNzA4MDNIMS42NzczOEgxLjY0Njk2SDEuNjE2NzhIMS41ODY4NEgxLjU1NzE1SDEuNTI3NjlIMS40OTg0OEgxLjQ2OTUySDEuNDQwNzlIMS40MTIzMkgxLjM4NDA5SDEuMzU2MTJIMS4zMjgzOUgxLjMwMDkxSDEuMjczNjlIMS4yNDY3MkgxLjIySDEuMTkzNTVIMS4xNjczNEgxLjE0MTRIMS4xMTU3MUgxLjA5MDI5SDEuMDY1MTNIMS4wNDAyM0gxLjAxNTU5SDAuOTkxMjE5SDAuOTY3MTE0SDAuOTQzMjc2SDAuOTE5NzA3SDAuODk2NDA3SDAuODczMzc4SDAuODUwNjIxSDAuODI4MTM3SDAuODA1OTI3SDAuNzgzOTkySDAuNzYyMzM0SDAuNzQwOTUzSDAuNzE5ODUxSDAuNjk5MDI5SDAuNjc4NDg4SDAuNjU4MjI5SDAuNjM4MjU0SDAuNjE4NTYzSDAuNTk5MTU3SDAuNTgwMDM5SDAuNTYxMjA4SDAuNTQyNjY2SDAuNTI0NDE0SDAuNTA2NDU0SDAuNTAwNjg2TDAuNTAwNjc5IDQxLjM0ODhMMC41MDA1OTggMzkuNTc5OUwwLjUwMDM1NSAzMy43OTYzTDAuNSAyMUMwLjUgOS42NzgxNiA5LjY3ODE2IDAuNSAyMSAwLjVDMzIuMzIxOCAwLjUgNDEuNSA5LjY3ODE2IDQxLjUgMjFaIiBmaWxsPSIjMkI4OUZGIiBzdHJva2U9IiNFOEVFRkQiLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yMiAxNi41QzIyIDE1Ljk0NzcgMjEuNTUyMyAxNS41IDIxIDE1LjVDMjAuNDQ3NyAxNS41IDIwIDE1Ljk0NzcgMjAgMTYuNVYxOC41SDE4QzE3LjQ0NzcgMTguNSAxNyAxOC45NDc3IDE3IDE5LjVDMTcgMjAuMDUyMyAxNy40NDc3IDIwLjUgMTggMjAuNUgyMFYyMi41QzIwIDIzLjA1MjMgMjAuNDQ3NyAyMy41IDIxIDIzLjVDMjEuNTUyMyAyMy41IDIyIDIzLjA1MjMgMjIgMjIuNVYyMC41SDI0QzI0LjU1MjMgMjAuNSAyNSAyMC4wNTIzIDI1IDE5LjVDMjUgMTguOTQ3NyAyNC41NTIzIDE4LjUgMjQgMTguNUgyMlYxNi41WiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTE5LjkxMDEgMjcuNTQyM0wxNyAyOS41NzkzVjI4VjI3SDE2SDE0QzEyLjg5NTQgMjcgMTIgMjYuMTA0NiAxMiAyNVYxNEMxMiAxMi44OTU0IDEyLjg5NTQgMTIgMTQgMTJIMjhDMjkuMTA0NiAxMiAzMCAxMi44OTU0IDMwIDE0VjI1QzMwIDI2LjEwNDYgMjkuMTA0NiAyNyAyOCAyN0gyMS42MzA0QzIxLjAxNDkgMjcgMjAuNDE0MyAyNy4xODkzIDE5LjkxMDEgMjcuNTQyM1oiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4K'

const LineContent = (props: TLineContentProps) => {
    const {
        commentsOn,
        content,
        showForm,
        showFormDir,
        containerProps,
        commentButtonProps,
        onCommentFormReset,
        onCommentFormSubmit,
    } = props
    return (
        <td className="relative group pl-4" {...containerProps}>
            {commentsOn && (
                <div
                    className={classNames(
                        'absolute hidden left-0 rounded-full w-5 h-5 mx-2 cursor-pointer',
                        'group-hover:block hover:scale-125 transition-transform',
                        `bg-contain bg-center bg-no-repeat`,
                    )}
                    style={{
                        backgroundImage: `url('${commentAddImg}')`,
                    }}
                    {...commentButtonProps}
                ></div>
            )}
            <div className="pl-4">
                <pre
                    dangerouslySetInnerHTML={{
                        __html: content,
                    }}
                />
            </div>

            {commentsOn && onCommentFormSubmit && (
                <div
                    className={classNames(
                        showForm ? 'absolute' : 'hidden',
                        showFormDir === 'up' ? 'bottom-4' : 'top-4',
                        'left-8 w-72 max-h-screen overflow-hidden bg-white z-50',
                        'border border-gray-e6edff rounded-xl',
                    )}
                >
                    <Formik initialValues={{ text: '' }} onSubmit={onCommentFormSubmit}>
                        {() => (
                            <Form>
                                <Field
                                    name="text"
                                    component={FormikTextarea}
                                    placeholder="Say something"
                                    rows={2}
                                    className="!border-0"
                                />
                                <div className="border-t border-gray-e6edff flex items-center justify-between">
                                    <div className="grow"></div>
                                    <div className="grow text-end">
                                        <Button
                                            variant="custom"
                                            type="button"
                                            className="text-xs text-gray-7c8db5"
                                            onClick={onCommentFormReset}
                                        >
                                            Close
                                        </Button>
                                        <Button
                                            variant="custom"
                                            type="submit"
                                            className="text-xs text-gray-7c8db5"
                                        >
                                            Submit
                                        </Button>
                                    </div>
                                </div>
                            </Form>
                        )}
                    </Formik>
                </div>
            )}
        </td>
    )
}

export default LineContent

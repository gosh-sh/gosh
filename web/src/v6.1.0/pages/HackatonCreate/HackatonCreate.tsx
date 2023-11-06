import { faList, faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Field, Form, Formik, FormikHelpers } from 'formik'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useSetRecoilState } from 'recoil'
import rehypeParse from 'rehype-parse'
import rehypeRemark from 'rehype-remark'
import remarkGfm from 'remark-gfm'
import remarkStringify from 'remark-stringify'
import SunEditor from 'suneditor-react'
import 'suneditor/dist/css/suneditor.min.css'
import { unified } from 'unified'
import { Button } from '../../../components/Form'
import { BaseField, FormikTextarea } from '../../../components/Formik'
import { appModalStateAtom } from '../../../store/app.state'
import {
    HackatonPrizePoolModal,
    HackatonPrizePoolPlaces,
    HackatonTypeBadge,
} from '../../components/Hackaton'
import { withPin, withRouteAnimation } from '../../hocs'
import { useDao } from '../../hooks/dao.hooks'
import { useCreateHackaton } from '../../hooks/hackaton.hooks'
import { DatesOverview } from './components'

type TFormValues = {
    description: {
        short: string
        readme: string
        rules: string
        prize: string
    }
    prize: {
        total: string
        places: string[]
    }
    dates: {
        start: number
        voting: number
        finish: number
    }
}

const HackatonCreatePage = () => {
    const { daoname } = useParams()
    const location = useLocation()
    const navigate = useNavigate()
    const setModal = useSetRecoilState(appModalStateAtom)
    const dao = useDao({ initialize: true, subscribe: true })
    const { create } = useCreateHackaton()

    const onUpdatePrizePoolClick = (
        value: TFormValues['prize'],
        setValue: FormikHelpers<TFormValues>['setFieldValue'],
    ) => {
        setModal({
            static: false,
            isOpen: true,
            element: (
                <HackatonPrizePoolModal
                    initial_values={value}
                    onSubmit={async (values) => {
                        await setValue('prize', values)
                        setModal((state) => ({ ...state, isOpen: false }))
                    }}
                />
            ),
        })
    }

    const onUpdateDatesSubmit = async (
        values: { [k: string]: number },
        setValue: FormikHelpers<TFormValues>['setFieldValue'],
    ) => {
        await setValue('dates', values)
    }

    const onFormSubmit = async (values: TFormValues) => {
        try {
            console.debug('V', values)
            // @ts-ignore
            const remarked = await unified()
                .use(rehypeParse)
                .use(rehypeRemark)
                .use([remarkGfm, remarkStringify])
                .process(values.description.readme)
            values.description.readme = remarked.value.toString()
            console.debug(values.description.readme)

            // const { eventaddr } = await create({
            //     title: location.state.name,
            //     type: location.state.type,
            //     ...values,
            // })
            // if (eventaddr) {
            //     navigate(`/o/${dao.details.name}/events/${eventaddr}`)
            // }
        } catch (e: any) {
            console.error(e)
        }
    }

    return (
        <div className="container py-10">
            <h1 className="mb-5 text-xl flex flex-wrap items-center gap-x-3">
                <div>
                    <Link
                        to={`/o/${daoname}`}
                        className="font-medium capitalize text-blue-2b89ff"
                    >
                        {daoname}
                    </Link>
                    <span className="mx-1">/</span>
                    <span className="font-medium">{location.state.name}</span>
                </div>

                <HackatonTypeBadge type={location.state.type} />
            </h1>
            <Formik
                initialValues={{
                    description: {
                        short: '',
                        readme: '',
                        rules: '',
                        prize: '',
                    },
                    prize: {
                        total: '',
                        places: [],
                    },
                    dates: {
                        start: 0,
                        voting: 0,
                        finish: 0,
                    },
                }}
                onSubmit={onFormSubmit}
            >
                {({ isSubmitting, values, setFieldValue }) => (
                    <Form>
                        <div className="row flex-wrap">
                            <div className="col !basis-full lg:!basis-7/12">
                                <div className="border border-gray-e6edff rounded-xl overflow-hidden">
                                    <div className="p-5 border-b border-b-gray-e6edff">
                                        <FontAwesomeIcon
                                            icon={faList}
                                            size="xs"
                                            className="mr-4 text-gray-7c8db5"
                                        />
                                        <span className="text-blue-2b89ff font-medium">
                                            README.md
                                        </span>
                                    </div>
                                    <div>
                                        <Field
                                            name="description.readme"
                                            component={BaseField}
                                        >
                                            <div className="sun-editor--noborder">
                                                <SunEditor
                                                    setOptions={{
                                                        height: '30rem',
                                                        buttonList: [
                                                            ['undo', 'redo'],
                                                            ['formatBlock'],
                                                            [
                                                                'bold',
                                                                'underline',
                                                                'italic',
                                                            ],
                                                            [
                                                                'list',
                                                                'table',
                                                                'link',
                                                                'image',
                                                            ],
                                                            ['removeFormat'],
                                                        ],
                                                    }}
                                                    onChange={(content) => {
                                                        setFieldValue(
                                                            'description.readme',
                                                            content,
                                                        )
                                                    }}
                                                />
                                            </div>
                                        </Field>
                                    </div>
                                </div>

                                <div className="mt-14 border border-gray-e6edff rounded-xl overflow-hidden">
                                    <div className="p-5 border-b border-b-gray-e6edff">
                                        <FontAwesomeIcon
                                            icon={faList}
                                            size="xs"
                                            className="mr-4 text-gray-7c8db5"
                                        />
                                        <span className="text-blue-2b89ff font-medium">
                                            RULES.md
                                        </span>
                                    </div>
                                    <div className="p-5">
                                        <Field
                                            name="description.rules"
                                            component={FormikTextarea}
                                            autoComplete="off"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>

                                <div className="mt-14 border border-gray-e6edff rounded-xl overflow-hidden">
                                    <div className="p-5 border-b border-b-gray-e6edff">
                                        <FontAwesomeIcon
                                            icon={faList}
                                            size="xs"
                                            className="mr-4 text-gray-7c8db5"
                                        />
                                        <span className="text-blue-2b89ff font-medium">
                                            PRIZES.md
                                        </span>
                                    </div>
                                    <div className="p-5">
                                        <Field
                                            name="description.prize"
                                            component={FormikTextarea}
                                            autoComplete="off"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="col !basis-full lg:!basis-5/12">
                                <div className="flex flex-col gap-y-5">
                                    <div className="border border-gray-e6edff rounded-xl overflow-hidden px-5">
                                        <div className="border-b border-b-gray-e6edff overflow-hidden">
                                            <div className="py-4 flex items-center justify-between">
                                                <div className="text-xl font-medium">
                                                    Prize pool
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="custom"
                                                    size="sm"
                                                    className="block border !border-blue-2b89ff text-blue-2b89ff !rounded-[2rem]"
                                                    onClick={() =>
                                                        onUpdatePrizePoolClick(
                                                            values.prize,
                                                            setFieldValue,
                                                        )
                                                    }
                                                >
                                                    {values.prize.places.length > 0
                                                        ? 'Update prize pool'
                                                        : 'Add prize pool'}
                                                    <FontAwesomeIcon
                                                        icon={faPlus}
                                                        className="ml-2"
                                                    />
                                                </Button>
                                            </div>

                                            <HackatonPrizePoolPlaces
                                                places={values.prize.places}
                                                className="mb-4"
                                            />
                                        </div>

                                        <DatesOverview
                                            initial_values={[
                                                {
                                                    key: 'start',
                                                    title: 'Start',
                                                    time: values.dates.start,
                                                },
                                                {
                                                    key: 'voting',
                                                    title: 'Voting',
                                                    time: values.dates.voting,
                                                },
                                                {
                                                    key: 'finish',
                                                    title: 'Finish',
                                                    time: values.dates.finish,
                                                },
                                            ]}
                                            onSubmit={async (values) => {
                                                await onUpdateDatesSubmit(
                                                    values,
                                                    setFieldValue,
                                                )
                                            }}
                                        />

                                        <div className="py-5">
                                            <Button
                                                type="submit"
                                                className="w-full"
                                                disabled={isSubmitting}
                                                isLoading={isSubmitting}
                                            >
                                                Create proposal to publish
                                            </Button>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="mb-4 text-lg font-medium">
                                            Short description
                                        </div>
                                        <Field
                                            name="description.short"
                                            component={FormikTextarea}
                                            autoComplete="off"
                                            minRows={5}
                                            maxRows={10}
                                            placeholder="Put short description here"
                                            disabled={isSubmitting}
                                        />
                                    </div>

                                    {/* <div>
                        <div className="pb-5 flex items-center gap-2">
                            <div className="text-lg font-medium">0 Experts in</div>
                            <div className="grow flex items-center gap-2">
                                <Button
                                    variant="custom"
                                    size="sm"
                                    className="block border !border-blue-2b89ff text-blue-2b89ff !rounded-[2rem]"
                                >
                                    Add tag
                                    <FontAwesomeIcon icon={faPlus} className="ml-2" />
                                </Button>
                            </div>
                        </div>
                        <div className="border border-gray-e6edff rounded-xl overflow-hidden px-5">
                            <div
                                className="py-4 w-full flex items-center justify-between
                                border-b border-b-gray-e6edff"
                            >
                                <div className="font-medium">Top 5 by total karma</div>
                            </div>

                            <div className="py-5 divide-y divide-gray-e6edff">
                                <p className="text-center">
                                    Add tags to see experts here
                                </p>
                            </div>
                        </div>
                    </div> */}
                                </div>
                            </div>
                        </div>
                    </Form>
                )}
            </Formik>
        </div>
    )
}

export default withRouteAnimation(withPin(HackatonCreatePage, { redirect: true }))

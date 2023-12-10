import { faClock, faHand } from '@fortawesome/free-regular-svg-icons'
import { faFlagCheckered, faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import classNames from 'classnames'
import { Field, Form, Formik, FormikHelpers } from 'formik'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Tooltip } from 'react-tooltip'
import { useSetRecoilState } from 'recoil'
import 'suneditor/dist/css/suneditor.min.css'
import { Button } from '../../../components/Form'
import { FormikTextarea } from '../../../components/Formik'
import { html2markdown } from '../../../helpers'
import { appModalStateAtom } from '../../../store/app.state'
import {
    HackathonPrizePoolModal,
    HackathonPrizePoolPlaces,
    HackathonTypeBadge,
} from '../../components/Hackathon'
import { withPin, withRouteAnimation } from '../../hocs'
import { useDao, useDaoMember } from '../../hooks/dao.hooks'
import { useCreateHackathon } from '../../hooks/hackathon.hooks'
import {
    DatesOverview,
    DescriptionFileField,
    HackathonExpertsOverview,
} from './components'

type TFormValues = {
    description: {
        brief: string
        readme: string
        rules: string
        prizes: string
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
    expert_tags: { label: string; value: string }[]
}

const HackathonCreatePage = () => {
    const { daoname } = useParams()
    const location = useLocation()
    const navigate = useNavigate()
    const setModal = useSetRecoilState(appModalStateAtom)
    const dao = useDao({ initialize: true, subscribe: true })
    useDaoMember({ initialize: true, subscribe: true })
    const { create } = useCreateHackathon()

    const onUpdatePrizePoolClick = (
        value: TFormValues['prize'],
        setValue: FormikHelpers<TFormValues>['setFieldValue'],
    ) => {
        setModal({
            static: false,
            isOpen: true,
            element: (
                <HackathonPrizePoolModal
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
            const remarked = {
                readme: await html2markdown(values.description.readme),
                prizes: await html2markdown(values.description.prizes),
                rules: await html2markdown(values.description.rules),
            }
            const updated = {
                ...values,
                description: { ...values.description, ...remarked },
                expert_tags: values.expert_tags.map(({ value }) => value),
            }

            const { eventaddr } = await create({
                name: location.state.name,
                type: location.state.type,
                ...updated,
            })
            if (eventaddr) {
                navigate(`/o/${dao.details.name}/events/${eventaddr}`)
            }
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

                <HackathonTypeBadge type={location.state.type} />
            </h1>
            <Formik
                initialValues={{
                    description: {
                        brief: '',
                        readme: '',
                        rules: '',
                        prizes: '',
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
                    expert_tags: [],
                }}
                onSubmit={onFormSubmit}
            >
                {({ isSubmitting, values, setFieldValue }) => (
                    <Form>
                        <div className="row flex-wrap lg:flex-nowrap">
                            <div className="col !basis-full lg:!basis-7/12 xl:!basis-8/12">
                                <DescriptionFileField
                                    type="readme"
                                    value={values.description.readme}
                                    onChange={(content) => {
                                        setFieldValue('description.readme', content)
                                    }}
                                />
                                <DescriptionFileField
                                    className="mt-14"
                                    type="rules"
                                    value={values.description.rules}
                                    onChange={(content) => {
                                        setFieldValue('description.rules', content)
                                    }}
                                />
                                <DescriptionFileField
                                    className="mt-14"
                                    type="prize"
                                    value={values.description.prizes}
                                    onChange={(content) => {
                                        setFieldValue('description.prizes', content)
                                    }}
                                />
                            </div>
                            <div className="col !basis-full lg:!basis-5/12 xl:!basis-4/12">
                                <div className="flex flex-col gap-y-5">
                                    <div className="border border-gray-e6edff rounded-xl overflow-hidden px-5">
                                        <div className="border-b border-b-gray-e6edff overflow-hidden">
                                            <div className="py-4 flex items-center justify-between">
                                                <div
                                                    className="text-xl font-medium"
                                                    data-tooltip-id="common-tip"
                                                    data-tooltip-content="Outline how much winners get rewarded and what for"
                                                >
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

                                            <HackathonPrizePoolPlaces
                                                places={values.prize.places}
                                                className={classNames(
                                                    values.prize.places.length
                                                        ? 'mb-4'
                                                        : null,
                                                )}
                                            />
                                        </div>

                                        <DatesOverview
                                            initial_values={[
                                                {
                                                    key: 'start',
                                                    title: 'Start',
                                                    icon: faClock,
                                                    time: values.dates.start,
                                                    hint: 'Select the time and day your program starts',
                                                },
                                                {
                                                    key: 'voting',
                                                    title: 'Voting',
                                                    icon: faHand,
                                                    time: values.dates.voting,
                                                    hint: 'Select the time and day when voting begins',
                                                },
                                                {
                                                    key: 'finish',
                                                    title: 'Finish',
                                                    icon: faFlagCheckered,
                                                    time: values.dates.finish,
                                                    hint: 'Select the time and day when winners are revealed',
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
                                            name="description.brief"
                                            component={FormikTextarea}
                                            autoComplete="off"
                                            minRows={5}
                                            maxRows={10}
                                            placeholder="Put short description here"
                                            disabled={isSubmitting}
                                        />
                                    </div>

                                    <HackathonExpertsOverview
                                        values={values.expert_tags}
                                        onChange={(option) => {
                                            setFieldValue('expert_tags', option)
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </Form>
                )}
            </Formik>

            <Tooltip id="common-tip" positionStrategy="fixed" className="z-10" />
        </div>
    )
}

export default withRouteAnimation(withPin(HackathonCreatePage, { redirect: true }))

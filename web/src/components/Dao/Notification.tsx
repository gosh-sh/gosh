import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Form, Formik } from 'formik'
import React, { useEffect, useState } from 'react'
import { AppConfig, classNames, GoshAdapterFactory, TDao } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Button } from '../Form'
import { ToastError, ToastSuccess } from '../Toast'

type TDaoNotificationProps = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
}

const Danger = (props: React.PropsWithChildren) => {
    const { children } = props
    return (
        <div
            className={classNames(
                'flex flex-nowrap items-center gap-x-4',
                'py-3 px-5 bg-red-ff3b30 text-white text-sm rounded-xl',
            )}
        >
            <div>
                <FontAwesomeIcon icon={faExclamationTriangle} size="lg" />
            </div>
            <div className="grow">{children}</div>
        </div>
    )
}

const DaoNotification = (props: TDaoNotificationProps) => {
    const { dao } = props
    const navigate = useNavigate()
    const [msgType, setMsgType] = useState<
        | 'isNotLatest'
        | 'isUpgradeAvailable'
        | 'isMintOnPrevDiff'
        | 'isRepoUpgradeNeeded'
        | 'isTaskUpgradeNeeded'
    >()

    const onIsMintOnPrevDiffSubmit = async () => {
        try {
            await dao.adapter.disableMint({
                comment:
                    'This proposal will pass the Token Mint Disable flag on to the newer version of your DAO',
            })
            toast.success(<ToastSuccess message={{ title: 'Event created' }} />)
            navigate(`/o/${dao.details.name}/events`)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    useEffect(() => {
        const _checkUpgrades = async () => {
            if (!dao || !dao.details.isAuthMember) {
                return
            }

            // Check if using latest version of DAO or new version avaiable
            const latest = Object.keys(AppConfig.versions).reverse()[0]
            if (dao.details.version !== latest) {
                const gosh = GoshAdapterFactory.createLatest()
                const newest = await gosh.getDao({
                    name: dao.details.name,
                    useAuth: false,
                })
                if (await newest.isDeployed()) {
                    setMsgType('isNotLatest')
                } else {
                    setMsgType('isUpgradeAvailable')
                }
                return
            }

            // Check DAO minting policy
            if (dao.details.isMintOnPrevDiff) {
                setMsgType('isMintOnPrevDiff')
                return
            }

            // Check repositories upgraded flag
            if (!dao.details.isRepoUpgraded) {
                setMsgType('isRepoUpgradeNeeded')
                return
            }

            // Check tasks upgraded flag
            if (!dao.details.isTaskRedeployed) {
                setMsgType('isTaskUpgradeNeeded')
                return
            }

            // Reset upgrades message
            setMsgType(undefined)
        }

        _checkUpgrades()
    }, [dao.details])

    if (msgType === 'isUpgradeAvailable') {
        return (
            <Danger>
                New version of DAO available.
                <br />
                It is highly recommended to complete all proposals before upgrade.
                <br />
                Check if corresponding proposal does not exist and go to the{' '}
                <Link
                    className="underline"
                    to={`/o/${dao.details.name}/settings/upgrade`}
                >
                    DAO upgrade
                </Link>{' '}
                page.
            </Danger>
        )
    }
    if (msgType === 'isNotLatest') {
        return (
            <Danger>
                You are using old version of DAO.
                <br />
                <button
                    className="underline"
                    onClick={() => {
                        document.location = `/o/${dao.details.name}`
                    }}
                >
                    Reload
                </button>{' '}
                page to go to the latest version
            </Danger>
        )
    }
    if (msgType === 'isMintOnPrevDiff') {
        return (
            <Danger>
                <Formik initialValues={{}} onSubmit={onIsMintOnPrevDiffSubmit}>
                    {({ isSubmitting }) => (
                        <Form>
                            <div>
                                We have detected the Token Mint Disable flag
                                misconfiguration
                            </div>
                            <div>
                                Please,{' '}
                                <Button
                                    variant="custom"
                                    type="submit"
                                    className="!p-0 underline font-medium"
                                    disabled={isSubmitting}
                                    isLoading={isSubmitting}
                                >
                                    click here
                                </Button>{' '}
                                to create fix proposal
                            </div>
                            <div>
                                This proposal will pass the Token Mint Disable flag on to
                                the newer version of your DAO
                            </div>
                        </Form>
                    )}
                </Formik>
            </Danger>
        )
    }
    if (msgType === 'isRepoUpgradeNeeded') {
        return (
            <Danger>
                DAO repositories should be upgraded.
                <br />
                Go to the repositories{' '}
                <Link className="underline" to={`/o/${dao.details.name}/repos/upgrade`}>
                    upgrade
                </Link>{' '}
                page
            </Danger>
        )
    }
    if (msgType === 'isTaskUpgradeNeeded') {
        return (
            <Danger>
                DAO tasks should be upgraded.
                <br />
                Please, go to the{' '}
                <Link className="underline" to={`/o/${dao.details.name}/tasks/upgrade`}>
                    tasks upgrade page
                </Link>
            </Danger>
        )
    }
    return null
}

export { DaoNotification }

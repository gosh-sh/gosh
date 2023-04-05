import { Form, Formik } from 'formik'
import { useEffect, useState } from 'react'
import { AppConfig, GoshAdapterFactory, TDao } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Button } from '../Form'
import { ToastError, ToastSuccess } from '../Toast'
import Alert from '../Alert/Alert'

type TDaoNotificationProps = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
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
            <Alert variant="danger">
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
            </Alert>
        )
    }
    if (msgType === 'isNotLatest') {
        return (
            <Alert variant="danger">
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
            </Alert>
        )
    }
    if (msgType === 'isMintOnPrevDiff') {
        return (
            <Alert variant="danger">
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
            </Alert>
        )
    }
    if (msgType === 'isRepoUpgradeNeeded') {
        return (
            <Alert variant="danger">
                DAO repositories should be upgraded.
                <br />
                Go to the repositories{' '}
                <Link className="underline" to={`/o/${dao.details.name}/repos/upgrade`}>
                    upgrade
                </Link>{' '}
                page
            </Alert>
        )
    }
    if (msgType === 'isTaskUpgradeNeeded') {
        return (
            <Alert variant="danger">
                DAO tasks should be upgraded.
                <br />
                Please, go to the{' '}
                <Link className="underline" to={`/o/${dao.details.name}/tasks/upgrade`}>
                    tasks upgrade page
                </Link>
            </Alert>
        )
    }
    return null
}

export { DaoNotification }

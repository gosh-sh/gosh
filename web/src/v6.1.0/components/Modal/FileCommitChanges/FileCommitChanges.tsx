import { Dialog, Tab } from '@headlessui/react'
import classNames from 'classnames'
import { Fragment, useCallback, useEffect, useState } from 'react'
import { IGoshDaoAdapter, IGoshRepositoryAdapter } from 'react-gosh/dist/gosh/interfaces'
import DiffPreview from '../../../../components/Blob/DiffPreview'
import BlobPreview from '../../../../components/Blob/Preview/Preview'
import Loader from '../../../../components/Loader'
import { ModalCloseButton } from '../../../../components/Modal'

type TFileCommitChangesModalProps = {
    _rg_dao?: IGoshDaoAdapter
    _rg_repo?: IGoshRepositoryAdapter
    history_item: {
        created_at: string
        commit_name: string
        snapshot_address: string
        snapshot_name: string
    }
}

const FileCommitChangesModal = (props: TFileCommitChangesModalProps) => {
    const { _rg_dao, _rg_repo, history_item } = props
    const [file_state, setFileState] = useState<{
        is_fetching: boolean
        file_path?: string
        current?: string | Buffer
        previous?: string | Buffer
    }>({ is_fetching: false })

    const getFileAtCommit = useCallback(async () => {
        if (!_rg_repo) {
            return
        }

        setFileState((state) => ({ ...state, is_fetching: true }))
        const { current, previous } = await _rg_repo.getCommitBlob(
            history_item.snapshot_address,
            history_item.snapshot_name,
            history_item.commit_name,
        )
        setFileState((state) => ({
            ...state,
            file_path: history_item.snapshot_name,
            current,
            previous,
            is_fetching: false,
        }))
    }, [history_item.snapshot_address, history_item.commit_name, _rg_repo])

    useEffect(() => {
        getFileAtCommit()
    }, [getFileAtCommit])

    return (
        <Dialog.Panel className="relative rounded-xl bg-gray-fafafd w-full max-w-7xl overflow-hidden">
            <div className="p-6 flex flex-wrap items-center justify-between gap-x-6">
                <h1 className="grow text-xl font-medium order-1">
                    File changes
                    <p className="text-sm text-gray-7c8db5 font-normal">
                        {history_item.snapshot_name}
                    </p>
                </h1>
                <div className="order-2 lg:order-3">
                    <ModalCloseButton className="relative !top-0 !right-0" />
                </div>
            </div>

            <Tab.Group>
                <Tab.List className="px-6 lg:px-2 pb-4 lg:pb-0">
                    {['File content', 'Changes'].map((title) => (
                        <Tab key={title} as={Fragment}>
                            {({ selected }) => (
                                <button
                                    className={classNames(
                                        'px-5 py-2 text-gray-53596d rounded-t-lg border-x border-t',
                                        'border-b lg:border-b-0 rounded-b-lg lg:rounded-b-none',
                                        selected
                                            ? 'border-gray-e6edff bg-white'
                                            : 'border-transparent bg-transparent',
                                    )}
                                    disabled={file_state.is_fetching}
                                >
                                    {title}
                                </button>
                            )}
                        </Tab>
                    ))}
                </Tab.List>
                <Tab.Panels className="bg-white mt-0 lg:-mt-px p-5 lg:p-10 border-t border-t-gray-e6edff">
                    <Tab.Panel>
                        {file_state.is_fetching ? (
                            <Loader>Loading file changes...</Loader>
                        ) : (
                            <BlobPreview
                                filename={file_state.file_path}
                                value={file_state.current}
                            />
                        )}
                    </Tab.Panel>
                    <Tab.Panel>
                        <DiffPreview
                            dao={_rg_dao!}
                            filename={file_state.file_path}
                            original={file_state.previous}
                            modified={file_state.current}
                            isDiffLoaded
                            getDiff={() => {}}
                        />
                    </Tab.Panel>
                </Tab.Panels>
            </Tab.Group>
        </Dialog.Panel>
    )
}

export default FileCommitChangesModal

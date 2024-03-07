import { Dialog } from '@headlessui/react'
import { TDao } from 'react-gosh'
import { IGoshRepositoryAdapter } from 'react-gosh/dist/gosh/interfaces'
import { useResetRecoilState, useSetRecoilState } from 'recoil'
import { Button } from '../../../components/Form'
import Loader from '../../../components/Loader'
import { ModalCloseButton } from '../../../components/Modal'
import { appModalStateAtom } from '../../../store/app.state'
import { useApplicationFormList } from '../../hooks/appform.hooks'
import { appform_atom } from '../../store/appform.state'
import { TApplicationForm } from '../../types/form.types'
import { ApplicationForm } from './ApplicationForm'

type TApplicationFormListProps = {
  dao_details: TDao
  repo_address: string
  repo_adapter: IGoshRepositoryAdapter
  branch: string
}

const ApplicationFormList = (props: TApplicationFormListProps) => {
  const { dao_details, repo_address, repo_adapter, branch } = props
  const setModal = useSetRecoilState(appModalStateAtom)
  const resetApplicationForm = useResetRecoilState(appform_atom)
  const { data, getFormList } = useApplicationFormList({
    repo_address,
    repo_adapter,
    branch,
  })

  const openApplicationForm = (form: TApplicationForm) => {
    setModal({
      isOpen: true,
      static: true,
      element: (
        <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-md overflow-clip">
          <ModalCloseButton onClose={closeApplicationForm} />
          <ApplicationForm
            dao_details={dao_details}
            repo_adapter={repo_adapter}
            branch={branch}
            application_form={form}
            onSubmit={() => {
              closeApplicationForm()
              getFormList()
            }}
          />
        </Dialog.Panel>
      ),
    })
  }

  const closeApplicationForm = async () => {
    setModal((state) => ({ ...state, isOpen: false }))
    setTimeout(resetApplicationForm, 200)
  }

  return (
    <>
      <div className="flex flex-col">
        {data.is_fetching && (
          <Loader className="text-sm">Fetching application forms...</Loader>
        )}

        {data.forms.map((item, index) => (
          <Button
            key={index}
            variant="link-secondary"
            className="!px-0 w-full text-start"
            onClick={() => openApplicationForm(item.application_form)}
          >
            {item.application_form.form.title}
          </Button>
        ))}
      </div>
    </>
  )
}

export { ApplicationFormList }

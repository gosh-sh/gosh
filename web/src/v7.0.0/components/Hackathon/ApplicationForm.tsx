import { faPencil, faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useNavigate } from 'react-router-dom'
import { useSetRecoilState } from 'recoil'
import { Button } from '../../../components/Form'
import { GoshError } from '../../../errors'
import { appModalStateAtom } from '../../../store/app.state'
import { useDao, useDaoMember } from '../../hooks/dao.hooks'
import { useHackathon, useUpdateHackathon } from '../../hooks/hackathon.hooks'
import { TFormGeneratorField, TUserSelectOption } from '../../types/form.types'
import { HackathonApplicationFormUpdate } from './ApplicationFormUpdate'

const HackathonApplicationForm = () => {
  const navigate = useNavigate()
  const setModal = useSetRecoilState(appModalStateAtom)
  const dao = useDao()
  const member = useDaoMember()
  const { hackathon } = useHackathon()
  const { updateStorageData } = useUpdateHackathon()

  const onUpdateApplicationFormModal = () => {
    setModal({
      static: true,
      isOpen: true,
      element: (
        <HackathonApplicationFormUpdate
          initial_values={{
            owners: [],
            fields: [],
            ...hackathon?.storagedata.application_form,
          }}
          onSubmit={onUpdateApplicationFormSubmit}
        />
      ),
    })
  }

  const onUpdateApplicationFormSubmit = async (values: {
    owners: TUserSelectOption['value'][]
    fields: TFormGeneratorField[]
  }) => {
    try {
      if (!hackathon) {
        throw new GoshError('Value error', 'Hackathon data is undefined')
      }

      const original = hackathon.storagedata.application_form_raw
      const modified = values
      const { event_address } = await updateStorageData({
        filename: {
          original: !!original ? 'application.form.json' : '',
          modified: 'application.form.json',
        },
        content: {
          original,
          modified: JSON.stringify(modified),
        },
      })

      setModal((state) => ({ ...state, isOpen: false }))
      if (event_address) {
        navigate(`/o/${dao.details.name}/events/${event_address}`)
      }
    } catch (e: any) {
      console.error(e.message)
    }
  }

  if (!hackathon?.storagedata.is_fetched || hackathon.is_voting_started) {
    return null
  }

  return (
    <div>
      <div className="py-5 border-b border-b-gray-e6edff text-center">
        {member.isMember && (
          <Button
            variant="custom"
            size="sm"
            className="border !border-blue-2b89ff text-blue-2b89ff !rounded-[2rem]"
            onClick={onUpdateApplicationFormModal}
          >
            <FontAwesomeIcon
              icon={!!hackathon.storagedata.application_form_raw ? faPencil : faPlus}
              className="mr-2"
            />
            {!!hackathon.storagedata.application_form_raw
              ? 'Update application form'
              : 'Add application form'}
          </Button>
        )}
      </div>
    </div>
  )
}

export { HackathonApplicationForm }

import { EDaoMemberType } from './dao.types'

export type TFormGeneratorField = {
  label: string
  name: string
  type: string
  required: boolean
}

export type TUserSelectOption = {
  label: string
  value: {
    name: string
    address: string
    type: EDaoMemberType
  }
}

import { EDaoMemberType } from './dao.types'

export type TApplicationForm = { filename: string; form: TFormGeneratorForm }

export type TFormGeneratorField = {
  label: string
  name: string
  type: string
  required: boolean
  static?: boolean
  disabled?: boolean
  value?: string
}

export type TFormGeneratorForm = {
  title: string
  fields: TFormGeneratorField[]
}

export type TUserSelectOption = {
  label: string
  value: {
    name: string
    address: string
    type: EDaoMemberType
  }
}

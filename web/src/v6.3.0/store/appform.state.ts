import { atom } from 'recoil'
import { contextVersion } from '../constants'
import { TFormGeneratorForm } from '../types/form.types'

export const appform_atom = atom<TFormGeneratorForm>({
  key: `ApplicationForm_${contextVersion}`,
  default: {
    title: '',
    fields: [],
  },
})

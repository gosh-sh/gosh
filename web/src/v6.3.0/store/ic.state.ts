import { atom } from 'recoil'
import { contextVersion } from '../constants'
import { EICCreateStep, TICCreateState } from '../types/ic.types'

export const ic_create_atom = atom<TICCreateState>({
  key: `ic-create-atom-${contextVersion}`,
  default: {
    step: { name: EICCreateStep.ROLES, params: {} },
    roles: { scientist: [], developer: [], issuer: [] },
    task: null,
    repository: null,
    documents: [],
    forms: [
      {
        filename: 'ic_project_characteristic.form.json',
        form: {
          title: 'Project characteristic',
          fields: [
            {
              label: 'Title',
              name: '8d63401b-7035-4b8e-9dca-49605d6be395',
              type: 'text',
              required: true,
            },
            {
              label: 'Project type',
              name: '5eeb5b8d-c70a-431e-b505-f97ba094b8c7',
              type: 'text',
              required: false,
            },
            {
              label: 'Regeneration / Conservation',
              name: '73a84d7e-759c-430f-a11c-25da5a31a513',
              type: 'textarea',
              required: false,
            },
            {
              label: 'Biodiversity metric types',
              name: 'eff0581c-c4ac-4686-ad4d-280a68219119',
              type: 'textarea',
              required: false,
            },
            {
              label: 'Project location',
              name: 'c41c8d64-b3a8-4e39-b785-06905e7c099c',
              type: 'textarea',
              required: false,
            },
            {
              label: 'Project developer',
              name: '576a502a-7b14-445d-ba1f-1de20f997212',
              type: 'textarea',
              required: false,
            },
          ],
        },
      },
      {
        filename: 'ic_credit_characteristic.form.json',
        form: {
          title: 'Credit characteristic',
          fields: [
            {
              label: 'Token name',
              name: 'token_name',
              type: 'text',
              required: true,
              static: true,
            },
            {
              label: 'Token symbol',
              name: 'token_symbol',
              type: 'text',
              required: true,
              static: true,
            },
            {
              label: 'Token decimals',
              name: 'token_decimals',
              type: 'text',
              required: true,
              static: true,
              disabled: true,
              value: '18',
            },
            {
              label: 'Methodology',
              name: '8e0b978b-5b35-44b5-8b93-f6705304d905',
              type: 'text',
              required: true,
            },
            {
              label: 'Year',
              name: '792deade-7fb7-40e5-ba11-e0759dc5d303',
              type: 'number',
              required: true,
            },
            {
              label: 'Number of credits to issue',
              name: '4fb97e71-e03d-40c9-906c-96ca1c034fbf',
              type: 'number',
              required: true,
            },
          ],
        },
      },
    ],
  },
})

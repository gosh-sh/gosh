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
        filename: 'project.json',
        form: {
          title: 'Project characteristic',
          fields: [
            {
              label: 'Title',
              name: 'title',
              type: 'text',
              required: true,
              static: true,
            },
            {
              label: 'Project type',
              name: 'project_type',
              type: 'text',
              required: true,
            },
            {
              label: 'Regeneration / Conservation',
              name: 'regeneration_conservation',
              type: 'textarea',
              required: false,
            },
            {
              label: 'Biodiversity metric types',
              name: 'biodiversity_metric_types',
              type: 'textarea',
              required: false,
            },
          ],
        },
      },
      {
        filename: 'credit.json',
        form: {
          title: 'Credit characteristic',
          fields: [
            {
              label: 'Title',
              name: 'title',
              type: 'text',
              required: true,
              static: true,
            },
          ],
        },
      },
    ],
  },
})

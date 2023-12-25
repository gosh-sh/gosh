export type accountStatus = 0 | 1 | 2

export type address = string

export type id = string

export type Status = 'success' | 'warning' | 'error' | 'loading'

export type DataColumn<T> = {
  label: string
  id: keyof T
  numeric: boolean
  disablePadding: boolean
  short?: boolean
  [key: string]: any
}

export type Image = {
  validated: Status
  id: string
  imageHash: string
  remoteUrl: string
  commit: string
}

export type Container = Image & {
  containerHash: string
  containerName: string
}

export type Validation = {
  id: string
  type: string
  active: boolean
  stdout: string
}

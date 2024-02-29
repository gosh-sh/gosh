import { TL2TransferStatusItem } from '../../../../types/l2.types'

export function isStatusItemLoading(item: TL2TransferStatusItem) {
  return item.status === 'pending'
}

export function isStatusItemDisabled(item: TL2TransferStatusItem) {
  return item.status === 'disabled' || item.status === 'pending'
}

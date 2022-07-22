import {
  UseTableOptions,
  UseColumnOrderInstanceProps,
  UseSortByOptions,
  UseSortByColumnProps,
  ColumnInstance,
  UseTableHeaderGroupProps
} from "react-table";

export interface TableOptions<D extends object = {}>
  extends 
    UseTableOptions<D>,
    UseSortByOptions<D>,
    UseColumnOrderInstanceProps<D> {}


export interface HeaderGroup<D extends object = {}> 
  extends
    ColumnInstance<D>,
    UseTableHeaderGroupProps<D>,
    UseSortByColumnProps<D> {}
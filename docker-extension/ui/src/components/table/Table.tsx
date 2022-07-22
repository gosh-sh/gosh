import React, { ReactNode, useState } from 'react';
import { useTable, useAbsoluteLayout, useColumnOrder, useSortBy, TableInstance } from "react-table";
import { DragDropContext, Droppable, Draggable, DraggableStateSnapshot, DraggingStyle, NotDraggingStyle } from "react-beautiful-dnd";

import styles from './Table.module.scss';
import classnames from "classnames/bind"; 

import {
  status,
  DataColumn,
  Image as ImageType,
  Container as ContainerType
} from "../../interfaces";
import { Icon } from '../icon';
    
const cnb = classnames.bind(styles)

const getItemStyle = ({ isDragging, isDropAnimating }: DraggableStateSnapshot, draggableStyle: DraggingStyle | NotDraggingStyle | undefined): any => ({
  ...draggableStyle,
  // some basic styles to make the items look a bit nicer
  userSelect: "none",

  // change background colour if dragging
  background: isDragging ? "#ffdb4d" : "transparent",
  borderRadius: ".5rem",
  boxShadow: isDragging ? "rgba(255, 204, 0, 0.25) 0px 8px 14px 0px" : "",

  ...(!isDragging && { transform: "translate(0,0)" }),
  ...(isDropAnimating && { transitionDuration: "0.001s" })

  // styles we need to apply on draggables
});

const StatusDot:React.FunctionComponent<{status: status}>  = ({status}) => <div className={cnb("status-dot", status)}></div>

export const Table = <T extends object, >({
  columns,
  data
}: {
  columns: Array<DataColumn<T>>,
  data: Array<T>
}) => {
  const [drag, setDrag] = useState<boolean>(false);
  // Use the state and functions returned from useTable to build your UI

  const defaultColumn = React.useMemo(
    () => ({
    }),
    []
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    flatHeaders,
    setColumnOrder,

    state
  }: TableInstance<T> & {setColumnOrder?: any} = useTable<T>(
    {
      columns,
      data,
      defaultColumn,
    },
    useColumnOrder,
    useSortBy,
    useAbsoluteLayout
  );

  const currentColOrder = React.useRef<Array<DataColumn<T>>>([]);

  // Render the UI for your table
  return (
    <>
      <div
        {...getTableProps()}
        className={cnb("table")}
      >
        <div
          className={cnb("table-header")}
        >
          {headerGroups.map((headerGroup, index) => (
            <DragDropContext
              key={index}
              onDragStart={() => {
                currentColOrder.current = flatHeaders.map((o:any) => o.id);
                setDrag(true);
              }}
              onDragEnd={(result, provided) => {
                setDrag(false);
              }}
              onDragUpdate={(dragUpdateObj, b) => {
                // console.log("onDragUpdate", dragUpdateObj, b);

                //const colOrder = [...currentColOrder.current];
                const colOrder: any[] = [...currentColOrder.current];
                const sIndex = dragUpdateObj.source.index;
                const dIndex =
                  dragUpdateObj.destination && (dragUpdateObj.destination.index > 1 ? dragUpdateObj.destination.index : 1 );

                if (typeof sIndex === "number" && typeof dIndex === "number" && colOrder.length) {
                  colOrder.splice(sIndex, 1);
                  colOrder.splice(dIndex, 0, dragUpdateObj.draggableId);
                  setColumnOrder(colOrder);

                  // console.log(
                  //   "onDragUpdate",
                  //   dragUpdateObj.destination.index,
                  //   dragUpdateObj.source.index
                  // );
                  // console.log(temp);
                }
              }}
            >
              <Droppable droppableId="droppable" direction="horizontal">
                {(droppableProvided, snapshot) => (
                  <div
                    {...headerGroup.getHeaderGroupProps()}
                    ref={droppableProvided.innerRef}
                    className={cnb("row")}
                  >
                    {headerGroup.headers.map((column, index) => (
                      <Draggable
                        key={column.id}
                        draggableId={column.id}
                        index={index}
                        //isDragDisabled={!column.accessor}
                        isDragDisabled={column.id === "validated" && false}
                      >
                        {(provided, snapshot) => {
                          // console.log(column.getHeaderProps());

                          // const {
                          //   style,
                          //   ...extraProps
                          // } = column.getHeaderProps();

                          // console.log(style, extraProps);

                          return (
                            <div
                              className={cnb("cell", {"is-dragging": drag})}
                              {...column.getHeaderProps()}
                              onClick={() => {
                                
                              }}
                            >
                              <div
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                // {...extraProps}
                                ref={provided.innerRef}
                                className={cnb("draggable")}
                                style={{
                                  ...getItemStyle(
                                    snapshot,
                                    provided.draggableProps.style
                                  )
                                  // ...style
                                }}
                              >
                                {column.render("Header")}
                              </div>

                              <div
                                className={cnb("placeholder")}
                              >
                                {column.render("Header")}
                                {column.render("Header") ? <Icon icon={"chevron-updown"}/> : ""}
                              </div>
                            </div>
                          );
                        }}
                      </Draggable>
                    ))}
                    {/* {droppableProvided.placeholder} */}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          ))}
        </div>

        <div
          className={cnb("table-body")}
          {...getTableBodyProps()}
        >
          {rows.map(
            (row, index) => {
              prepareRow(row);
              return (
                <div
                  {...row.getRowProps()}
                  className={cnb("row")}
                  key={index}
                >
                  {row.cells.map(cell => {
                    return (
                      <div
                        {...cell.getCellProps()}
                        className={cnb("cell")}
                      >
                        {cell.column.id === "validated" ? (cell.render("Cell") ? <StatusDot status={cell.value}/> : <StatusDot status="warning"/>) : cell.render("Cell")}
                      </div>
                    );
                  })}
                </div>
              )
            }
          )}
        </div>
      </div>
    </>
  );
}

export default Table;
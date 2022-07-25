import React, { useState, useEffect, Fragment } from 'react';

import { DockerClient } from './../../client';
import Container from '@mui/material/Container';
import cn from 'classnames';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Paper from '@mui/material/Paper';

import { visuallyHidden } from '@mui/utils';

import {
    DataColumn,
    Validation,
    Image as ImageType,
    Container as ContainerType,
} from './../../interfaces';

const StatusDot = ({ status }: { status: string }) => (
    <div className={cn('dd-status-dot', status)}></div>
);

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
    if (b[orderBy] < a[orderBy]) {
        return -1;
    }
    if (b[orderBy] > a[orderBy]) {
        return 1;
    }
    return 0;
}

type Order = 'asc' | 'desc';

function getComparator<T>(order: Order, orderBy: keyof T): (a: T, b: T) => number {
    return order === 'desc'
        ? (a, b) => descendingComparator<T>(a, b, orderBy)
        : (a, b) => -descendingComparator<T>(a, b, orderBy);
}

function stableSort<T>(array: readonly T[], comparator: (a: T, b: T) => number) {
    const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) {
            return order;
        }
        return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
}

interface EnhancedTableProps<T> {
    onRequestSort: (event: React.MouseEvent<unknown>, property: keyof T) => void;
    order: Order;
    orderBy: string;
    rowCount: number;
}
function EnhancedTableHead<T>(
    props: EnhancedTableProps<T> & { headCells: DataColumn<T>[] }
) {
    const { order, orderBy, headCells, onRequestSort } = props;
    const createSortHandler =
        (property: keyof T) => (event: React.MouseEvent<unknown>) => {
            onRequestSort(event, property);
        };

    return (
        <TableHead>
            <TableRow>
                {headCells.map((headCell) => (
                    <TableCell
                        key={headCell.id as React.Key}
                        align={headCell.numeric ? 'right' : 'left'}
                        padding={headCell.disablePadding ? 'none' : 'normal'}
                        sortDirection={orderBy === headCell.id ? order : false}
                    >
                        <TableSortLabel
                            active={orderBy === headCell.id}
                            direction={orderBy === headCell.id ? order : 'asc'}
                            onClick={createSortHandler(headCell.id)}
                        >
                            {headCell.label}
                            {orderBy === headCell.id ? (
                                <Box component="span" sx={visuallyHidden}>
                                    {order === 'desc'
                                        ? 'sorted descending'
                                        : 'sorted ascending'}
                                </Box>
                            ) : null}
                        </TableSortLabel>
                    </TableCell>
                ))}
                <TableCell></TableCell>
            </TableRow>
        </TableHead>
    );
}

function EnhancedTable<T extends { id: string }>({
    data,
    columns,
    actionFunction,
    actionEndFunction,
    actionCaption,
    actionActive,
}: {
    data: { isLoading: boolean, data: Array<T> }
    columns: DataColumn<T>[];
    actionFunction: (element: T, index: number) => void;
    actionEndFunction?: () => void;
    actionCaption: string;
    actionActive: boolean | Validation;
}) {
    const [order, setOrder] = React.useState<Order>('asc');
    const [orderBy, setOrderBy] = React.useState<keyof T>('validated' as keyof T);
    const [dense] = React.useState(false);

    const handleRequestSort = (event: React.MouseEvent<unknown>, property: keyof T) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    return (
        <Box sx={{ width: '100%' }}>
            <Paper
                sx={{ width: '100%', mb: 2, borderRadius: '4px!important' }}
                elevation={1}
                variant={'elevation'}
                className={'table-wrapper'}
            >
                <TableContainer>
                    <Table
                        sx={{ minWidth: 750 }}
                        aria-labelledby="tableTitle"
                        size={dense ? 'small' : 'medium'}
                    >
                        <EnhancedTableHead<T>
                            order={order}
                            orderBy={orderBy as string}
                            onRequestSort={handleRequestSort}
                            rowCount={data.data.length}
                            headCells={columns}
                        />
                        <TableBody>
                            {!data.isLoading ? (
                                stableSort<T>(data.data, getComparator<T>(order, orderBy)).map(
                                    (row, index) => {
                                        return (
                                            <Fragment key={index}>
                                                <TableRow
                                                    key={index}
                                                    className={cn({
                                                        'dd-table-row-noborder':
                                                            actionActive &&
                                                            actionActive !== true &&
                                                            actionActive.id === row.id!,
                                                    })}
                                                >
                                                    {columns.map((column, i) =>
                                                        column.id === 'validated' ? (
                                                            <TableCell
                                                                key={String(column.id)}
                                                            >
                                                                <StatusDot
                                                                    status={String(
                                                                        row[column.id]
                                                                    )}
                                                                />
                                                            </TableCell>
                                                        ) : (
                                                            <TableCell
                                                                key={String(column.id)}
                                                            >
                                                                <>{row[column.id]}</>
                                                            </TableCell>
                                                        )
                                                    )}
                                                    <TableCell className="dd-cell-button">
                                                        {actionActive &&
                                                            actionActive !== true &&
                                                            actionActive.id === row.id! &&
                                                            !actionActive.active ? (
                                                            <button
                                                                type="button"
                                                                className="btn btn--body px-2.5 py-1.5 text-xs rounded"
                                                                onClick={() => {
                                                                    actionEndFunction &&
                                                                        actionEndFunction();
                                                                }}
                                                            >
                                                                Close
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                className="btn btn--body px-2.5 py-1.5 text-xs rounded"
                                                                disabled={Boolean(
                                                                    actionActive
                                                                )}
                                                                onClick={() => {
                                                                    actionFunction(
                                                                        row,
                                                                        index
                                                                    );
                                                                }}
                                                            >
                                                                {actionCaption}
                                                            </button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                                {actionActive &&
                                                    actionActive !== true &&
                                                    actionActive.id === row.id! && (
                                                        <TableRow key={index}>
                                                            <TableCell colSpan={10}>
                                                                <pre className="text-xs">
                                                                    <code>
                                                                        {actionActive.stdout ||
                                                                            'Initialising validation...'}
                                                                    </code>
                                                                </pre>
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                            </Fragment>
                                        );
                                    }
                                )
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length}>
                                        <span className="dd-loading">Loading...</span>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
}

const Main = () => {
    const [validation, setValidation] = useState<boolean | Validation>(false);
    const [containers, setContainers] = useState<{ data: Array<ContainerType>, isLoading: boolean }>({
        isLoading: false,
        data: [],
    });
    const [images, setImages] = useState<{ data: Array<ImageType>, isLoading: boolean }>({
        isLoading: false,
        data: [],
    });

    const columns: DataColumn<ContainerType>[] = React.useMemo(
        () => [
            {
                label: '',
                id: 'validated',
                maxWidth: 30,
                minWidth: 30,
                width: 30,
                numeric: false,
                disablePadding: false,
            },
            {
                label: 'Container hash',
                id: 'containerHash',
                numeric: false,
                disablePadding: false,
                maxWidth: 400,
                minWidth: 150,
                width: 200,
            },
            {
                label: 'Container name',
                id: 'containerName',
                numeric: false,
                disablePadding: false,
                maxWidth: 400,
                minWidth: 165,
                width: 200,
            },
            {
                label: 'Image hash',
                id: 'imageHash',
                numeric: false,
                disablePadding: false,
                maxWidth: 400,
                minWidth: 165,
                width: 200,
            },
            {
                label: 'Build provider',
                id: 'buildProvider',
                numeric: false,
                disablePadding: false,
                maxWidth: 400,
                minWidth: 165,
                width: 200,
            },
            {
                label: 'Gosh network root',
                id: 'goshRootAddress',
                numeric: false,
                disablePadding: false,
                maxWidth: 400,
                minWidth: 165,
                width: 200,
            },
        ],
        []
    );
    const columnsImage: Array<DataColumn<ImageType>> = React.useMemo(
        () => [
            {
                label: '',
                id: 'validated',
                numeric: false,
                disablePadding: false,
                maxWidth: 30,
                minWidth: 30,
                width: 30,
            },
            {
                label: 'Image hash',
                id: 'imageHash',
                numeric: false,
                disablePadding: false,
                maxWidth: 400,
                minWidth: 165,
                width: 200,
            },
            {
                label: 'Build provider',
                id: 'buildProvider',
                numeric: false,
                disablePadding: false,
                maxWidth: 400,
                minWidth: 165,
                width: 200,
            },
            {
                label: 'Gosh network root',
                id: 'goshRootAddress',
                numeric: false,
                disablePadding: false,
                maxWidth: 400,
                minWidth: 165,
                width: 200,
            },
        ],
        []
    );

    // const data = React.useMemo<ContainerType[]>(
    //     () => [
    //         {
    //             validated: 'success',
    //             id: '05deec074512993...',
    //             containerHash: '05deec074512993...',
    //             containerName: '/exciting_brahrnag...',
    //             imageHash: 'sha256:137444141...',
    //             buildProvider: '-',
    //             goshRootAddress: '',
    //         },
    //         {
    //             validated: 'success',
    //             id: '85b26c7366d42e...',
    //             containerHash: '85b26c7366d42e...',
    //             containerName: '/blissful_gates',
    //             imageHash: 'sha256:3954a180f...',
    //             buildProvider: '95c06aa743d1f90...',
    //             goshRootAddress: '',
    //         },
    //         {
    //             validated: 'error',
    //             id: '0c9039aa990d70... ',
    //             containerHash: '0c9039aa990d70... ',
    //             containerName: '/docker-beautifu...',
    //             imageHash: 'sha256:b5ec650b2...',
    //             buildProvider: '84a595396a47a6c...',
    //             goshRootAddress: '',
    //         },
    //     ],
    //     undefined
    // );

    // const dataImage = React.useMemo<ImageType[]>(
    //     () => [
    //         {
    //             validated: 'success',
    //             id: 'sha256:3954a180f...',
    //             imageHash: 'sha256:3954a180f...',
    //             buildProvider: '95c06aa743d1f90...',
    //             goshRootAddress: '',
    //         },
    //         {
    //             validated: 'success',
    //             id: 'sha256:137444141...',
    //             imageHash: 'sha256:137444141...',
    //             buildProvider: '-',
    //             goshRootAddress: '',
    //         },
    //     ],
    //     undefined
    // );

    useEffect(() => {
        setContainers({
            data: [],
            isLoading: true,
        });
        DockerClient.getContainers().then((value) => {
            console.log(value);
            setContainers({
                data: value.map((container: ContainerType) => ({
                    ...container,
                    id: container.containerHash,
                })) || [],
                isLoading: false,
            });
        });
    }, []);

    useEffect(() => {
        setImages({
            data: [],
            isLoading: true,
        });
        DockerClient.getImages().then((value) => {
            console.log(value);
            setImages({
                data: value.map((image: ImageType) => ({ ...image, id: image.imageHash })),
                isLoading: false,
            });
        });
    }, []);


    const handleClick = () => {
        setContainers({
            data: [],
            isLoading: true,
        });
        DockerClient.getContainers().then((value) => {
            console.log(value);
            setContainers({
                data: value || [],
                isLoading: false,
            });
            //do stuff
        });
    };

    function validateContainer(element: ContainerType, index: number): void {
        let logs: string[] = [];
        setValidation({
            id: element.containerHash,
            type: 'container',
            active: true,
            stdout: '',
        });
        DockerClient.validateContainerImage(
            element.imageHash,
            (status: string) => {
                logs.push(status);
                setValidation({
                    id: element.containerHash,
                    type: 'container',
                    active: true,
                    stdout: logs.join('\n'),
                });
            },
            () =>
                setValidation({
                    id: element.containerHash,
                    type: 'container',
                    active: false,
                    stdout: logs.join('\n'),
                })
        );
    }

    function validateImage(element: ImageType, index: number): void {
        let logs: string[] = [];
        setValidation({
            id: element.imageHash,
            type: 'image',
            active: true,
            stdout: '',
        });
        DockerClient.validateContainerImage(
            element.imageHash,
            (status: string) => {
                logs.push(status);
                setValidation({
                    id: element.imageHash,
                    type: 'image',
                    active: true,
                    stdout: logs.join('\n'),
                });
            },
            () =>
                setValidation({
                    id: element.imageHash,
                    type: 'image',
                    active: false,
                    stdout: logs.join('\n'),
                })
        );
    }

    function closeValidation(): void {
        setValidation(false);
    }

    return (
        <>
            <div className="dd-button-block">
                <button
                    type="button"
                    className="btn btn--body py-1.5 px-5 text-sm uppercase"
                    onClick={handleClick}
                >
                    Update data
                </button>
            </div>

            <Container className="dd-containers mt-12">
                <h6 className="mb-2">Containers</h6>
                <EnhancedTable<ContainerType>
                    data={containers}
                    columns={columns}
                    actionFunction={validateContainer}
                    actionEndFunction={closeValidation}
                    actionCaption={'Validate'}
                    actionActive={
                        validation
                            ? validation !== true && validation.type === 'container'
                                ? validation
                                : true
                            : validation
                    }
                />
                <h6 className="mt-10 mb-2">Images</h6>
                <EnhancedTable<ImageType>
                    data={images}
                    columns={columnsImage}
                    actionFunction={validateImage}
                    actionEndFunction={closeValidation}
                    actionCaption={'Validate'}
                    actionActive={
                        validation
                            ? validation !== true && validation.type === 'image'
                                ? validation
                                : true
                            : validation
                    }
                />
            </Container>
        </>
    );
};

export default Main;

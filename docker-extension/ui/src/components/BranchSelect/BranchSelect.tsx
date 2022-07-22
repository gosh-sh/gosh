import React, { useEffect, useRef, useState } from "react";
import { Listbox } from "@headlessui/react";
import { TGoshBranch } from "./../../types/types";

import styles from './BranchSelect.module.scss';
import classnames from "classnames/bind";
import Paper from '@mui/material/Paper';
import Input from '@mui/material/Input';
import { Icon } from "../Icon";
import { ChevronDownIcon } from '@heroicons/react/outline';
import { Typography } from "@mui/material";

const cnb = classnames.bind(styles);


type TBranchSelectProps = {
    branch?: TGoshBranch;
    branches: TGoshBranch[];
    className?: string;
    disabled?: boolean;
    onChange(selected: TGoshBranch | undefined): void;
}

export const BranchSelect = (props: TBranchSelectProps) => {
    const { branch, branches, disabled, onChange } = props;
    const searchRef = useRef<HTMLInputElement>(null);
    const [search, setSearch] = useState<string>('');
    const [filtered, setFiltered] = useState<TGoshBranch[]>(branches);

    useEffect(() => {
        setFiltered(branches);
    }, [branches]);

    useEffect(() => {
        if (search) {
            const pattern = new RegExp(search, 'i');
            setFiltered(branches.filter((item) => item.name.search(pattern) >= 0));
        } else {
            setFiltered(branches);
        }
    }, [branches, search]);

    return (
        <Listbox
            as="div"
            className={cnb("list-box", props.className)}
            value={branch}
            disabled={disabled}
            onChange={(value: any) => onChange(value)}
        >
            <Listbox.Button
                as="div"
                tabIndex={0}
                className={cnb("list-box-button")}
            >
                {branch?.name ? branch?.name : <span className={cnb("placeholder")}>Fetching...</span>} <Icon icon="chevron-down"/>
            </Listbox.Button>
            <Listbox.Options
                className={cnb("list-box-options")}
                onFocusCapture={() => searchRef.current?.focus()}
            >
                <Paper
                    className={cnb("list-box-options-paper")}
                    elevation={14}
                >

                    <Input
                        ref={searchRef}
                        type="text"
                        className={cnb("input", "input-field")}
                        autoComplete="off"
                        placeholder="Search branch"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    {!filtered.length && (
                        <Typography className={cnb("branch-list-empty")}>
                            No branch found
                        </Typography>
                    )}

                    {filtered.map((item) => (
                        <Listbox.Option
                            key={item.name}
                            value={item}
                            className={cnb("branch-list-item")}
                        >
                            {item.name}
                        </Listbox.Option>
                    ))}
                </Paper>
            </Listbox.Options>
        </Listbox>
    );
}

export default BranchSelect;

import React, { useEffect, useRef, useState } from "react";
import { Listbox } from "@headlessui/react";
import { TGoshBranch } from "../../types/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faCodeBranch } from "@fortawesome/free-solid-svg-icons";
import { classNames } from "../../utils";


type TBranchSelectProps = {
    className?: string;
    branch?: TGoshBranch;
    branches: TGoshBranch[];
    disabled?: boolean;
    onChange(selected: TGoshBranch | undefined): void;
}

const BranchSelect = (props: TBranchSelectProps) => {
    const { className, branch, branches, disabled, onChange } = props;
    const searchRef = useRef<HTMLInputElement>(null);
    const [search, setSearch] = useState<string>('');
    const [filtered, setFiltered] = useState<TGoshBranch[]>(branches);

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
            className={() => classNames(
                'relative inline-block min-w-[7rem] max-w-[12rem] border rounded',
                disabled ? 'bg-gray-100' : '',
                className
            )}
            value={branch}
            disabled={disabled}
            onChange={(value) => onChange(value)}

        >
            <Listbox.Button
                as="div"
                tabIndex={0}
                className="flex gap-x-3 px-3 py-1.5 text-sm font-medium justify-between items-center cursor-pointer"
            >
                <div className="grow items-center justify-start truncate">
                    <FontAwesomeIcon icon={faCodeBranch} size="sm" className="mr-2" />
                    {branch?.name}
                </div>
                <FontAwesomeIcon icon={faChevronDown} size="xs" />
            </Listbox.Button>
            <Listbox.Options
                className="absolute z-10 left-0 top-full w-52 overflow-hidden mt-1 text-sm bg-white rounded shadow-md ring-1 ring-black ring-opacity-5 focus:outline-none"
                onFocusCapture={() => searchRef.current?.focus()}
            >
                <div className="px-2 py-2 border-b">
                    <div className="input">
                        <input
                            ref={searchRef}
                            type="text"
                            className="element !py-1 !text-sm"
                            autoComplete="off"
                            placeholder="Search branch"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="max-h-56 overflow-auto">
                    {!filtered.length && (
                        <div className="py-2 text-center text-gray-606060 text-xs">
                            No branch found
                        </div>
                    )}

                    {filtered.map((item) => (
                        <Listbox.Option
                            key={item.name}
                            value={item}
                            className={({ active }) => {
                                return classNames(
                                    'cursor-pointer py-2 px-3 truncate border-b last:border-b-0 hover:bg-gray-50',
                                    active ? 'bg-gray-50' : ''
                                )
                            }}
                        >
                            {item.name}
                        </Listbox.Option>
                    ))}
                </div>
            </Listbox.Options>
        </Listbox>
    );
}

export default BranchSelect;

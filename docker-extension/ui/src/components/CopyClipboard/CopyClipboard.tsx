
import React, { ReactNode } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import { toast, Slide } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { ToastOptionsShortcuts } from "./../../utils";
import IconButton from '@mui/material/IconButton';
import { DocumentDuplicateIcon } from '@heroicons/react/outline';
import styles from './CopyClipboard.module.scss';
import classnames from "classnames/bind";

const cnb = classnames.bind(styles);


type TCopyClipboardProps = {
    componentProps: Omit<CopyToClipboard.Props, 'children'>;
    className?: string;
    label?: ReactNode;
    labelClassName?: string;
    iconContainerClassName?: string;
}

const CopyClipboard = (props: TCopyClipboardProps) => {
    const {
        componentProps,
        className,
        label,
        labelClassName,
        iconContainerClassName,
    } = props;

    return (
        <CopyToClipboard
            {...componentProps}
            text={componentProps.text}
            onCopy={componentProps.onCopy
                ? componentProps.onCopy
                : () => toast.success('Copied', {
                    ...ToastOptionsShortcuts.CopyMessage,
                    position: toast.POSITION.BOTTOM_RIGHT,
                    draggable: false,
                    className: cnb("toast"),
                    transition: Slide
                })
            }
        >
            <div
                className={cnb("flex", className)}
            >
                {label && (
                    <div className={cnb(labelClassName)}>{label}</div>
                )}

                <IconButton
                    edge="start"
                    color="inherit"
                    aria-label="close"
                    className={cnb("close")}

                >
                    <DocumentDuplicateIcon />
                </IconButton>
            </div>
        </CopyToClipboard>
    );
}

export default CopyClipboard;

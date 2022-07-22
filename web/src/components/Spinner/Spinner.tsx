import React from "react";
import { FontAwesomeIcon, FontAwesomeIconProps } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";


type TSpinnerProps = Omit<FontAwesomeIconProps, 'icon'>;

const Spinner = (props: TSpinnerProps) => {
    return (
        <FontAwesomeIcon {...props} icon={faSpinner} spin speed={'100s'} />
    );
}

export default Spinner;

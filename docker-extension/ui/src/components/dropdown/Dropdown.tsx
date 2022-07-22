import React, { FunctionComponent, useState, useEffect, useRef, ReactNode } from "react";
import { Dropdown as DropdownBs, NavDropdown } from "react-bootstrap";
import { Link } from "react-router-dom";
import styles from './Dropdown.module.scss';
// import { FormikContextType, useFormikContext, Field, FieldProps, FormikErrors, FormikTouched } from 'formik';
import { Icon } from "..";
import { FormGroupProps } from "../../interfaces";
import classnames from "classnames/bind";

const cnb = classnames.bind(styles);

interface OptionProps {
  to?: string,
  href?: string,
  title: string,
  disabled?: boolean,
  default?: boolean,
  hidden?: boolean,
}

interface DropdownProps {
  options: OptionProps[],
  title: string,
  placeholder: string
  active?: boolean,
  className?: string,
  disabled?: boolean,
  isNav?: boolean
}

export const Dropdown = React.forwardRef<HTMLElement,DropdownProps>((props, ref) => {
  const {
    title,
    placeholder,
    options,
    isNav,
    active,
    disabled,
    className
  } = props;
  
  const [show, setShow] = useState(false);
  const showDropdown = () => {
      setShow(!show);
  }
  const hideDropdown = () => {
      setShow(false);
  }

  return (isNav
    ? <NavDropdown
        title={<>{title ? title : (placeholder)}<Icon icon="chevron-updown"/></>}
        disabled={disabled}
        active={active || show}
        show={active || (show && !disabled)}
        onMouseEnter={showDropdown} 
        onMouseLeave={hideDropdown}
        className={cnb("nav-dropdown", "dropdown", "action", "action-normal", className)}
      >
      {options.map((option, index) => {
        return option.to 
          ? <NavDropdown.Item as={Link} key={index} disabled={option.disabled} to={option.to} className={cnb("action", "action-normal", {"disabled": option.disabled})}>{option.title}</NavDropdown.Item>
          : <NavDropdown.Item href={option.href} key={index} disabled={option.disabled} className={cnb("action", "action-normal", {"disabled": option.disabled})}>{option.title}</NavDropdown.Item>
      })}
      </NavDropdown>
  : <DropdownBs className={className}>
    <DropdownBs.Toggle variant="success" disabled={disabled}>
      {title ? title : (placeholder)}
    </DropdownBs.Toggle>

    <DropdownBs.Menu
      show={true}
    >
      {options.map((option, index) => {
        return option.to 
          ? <DropdownBs.Item as={Link} key={index} to="#/action-1">{option.title}</DropdownBs.Item>
          : <DropdownBs.Item href={option.href} key={index}>{option.title}</DropdownBs.Item>
      })}
    </DropdownBs.Menu>
  </DropdownBs>
)});

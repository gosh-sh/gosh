import React, { FunctionComponent, useRef } from "react";
import { Button as BsButton, ButtonProps as BsButtonProps } from "react-bootstrap";
import styles from './Button.module.scss';
import classnames from "classnames/bind";

const cnb = classnames.bind(styles);

export interface ButtonProps extends Omit<BsButtonProps, 'variant'|'size'|'rounded'> {
  size?: BsButtonProps['size'] | "xl" | "blank",
  variant?: BsButtonProps['variant'] | "primary" | "transparent" | "clear",
  disabled?: boolean,
  rounded?: boolean,
  className?: string,
  children?: React.ReactNode,
  theme?: any,
  icon?: React.ReactNode,
  iconAnimation?: "left" | "right",
  iconPosition?: "before" | "after",
}

export const Button: FunctionComponent<ButtonProps> = ({rounded, icon, iconAnimation, iconPosition, ...props}) => {
  const newProps:BsButtonProps = {...(props as BsButtonProps), size: undefined} as BsButtonProps;
  const ref = useRef<HTMLButtonElement>(null)

  // useEffect(() => {
  //   if (ref.current) {
  //     ref.current.addEventListener("mousemove", hoverHandler);
  //   }
  //   return () => {
  //     if (ref.current) {
  //       ref.current.removeEventListener("mousemove", hoverHandler);
  //     }
  //   }
  // }, [ref.current])
  newProps.className = newProps.className + ' action action-normal';

  if (props.size === "xl") {
    newProps.className = newProps.className ? newProps.className+' '+styles['btn-xl'] : styles['btn-xl'];
  } else if (props.size === "blank") {
    newProps.className = newProps.className ? newProps.className+' '+styles['btn-blank'] : styles['btn-blank'];
  } else if (props.size) {
    newProps.className = newProps.className ? newProps.className+' '+styles['btn-'+props.size] : styles['btn-'+props.size];
    newProps.size = props.size;
  }
  if (icon) {
    newProps.className = newProps.className ? `${newProps.className} ${styles['btn-icon']} ${iconPosition ? styles['btn-icon-'+iconPosition] : ""}` : `${styles['btn-icon']} ${iconPosition ? styles['btn-icon-'+iconPosition] : ""}`;
    newProps.children = iconPosition === "before" ? <>{icon}{newProps.children}</> : <>{newProps.children}{icon}</>;
  }
  if (props.variant) {
    newProps.className = newProps.className ? `${newProps.className} ${styles['btn-'+props.variant]}` : styles['btn-'+props.variant];
  }
  if (rounded) {
    newProps.className = newProps.className ? `${newProps.className} ${styles['btn-rounded']}` : styles['btn-rounded'];
  }
  if (iconAnimation) {
    newProps.className = newProps.className ? `${newProps.className} ${styles['btn-animated-'+iconAnimation]}` : styles['btn-animated-'+iconAnimation];
  }
  return <BsButton ref={ref} {...newProps} className={`${styles.btn} ${newProps.className}`}/>;
};

export default Button;
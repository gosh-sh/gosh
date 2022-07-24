import { useEffect, ReactNode, InputHTMLAttributes } from "react";
import styles from './Flex.module.scss';
import classnames from "classnames/bind";

const cnb = classnames.bind(styles);

export interface FlexProps extends InputHTMLAttributes<HTMLInputElement>{
  grow?: number,
  shrink?: number
  align?: string
}
export interface FlexContainerProps extends InputHTMLAttributes<HTMLInputElement>{
  direction?: string,
  className?: string,
  justify?: string,
  align?: string,
}

export const FlexContainer = ({
  direction,
  justify,
  className,
  align,
  children,
  style,
  ...props
} : FlexContainerProps) => {
  return <>
    <div
      className={cnb("flex-container", className, direction ? "flex-container-" + direction : "flex-container-row")}
      style={{
        justifyContent: justify,
        alignItems: align,
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  </>;
};

export const Flex = ({
  grow,
  align,
  shrink,
  style,
  children,
  ...props
} : FlexProps) => {
  return <>
    <div
      className={cnb("flex")}
      style={{
        flexGrow: grow,
        alignSelf: align,
        flexShrink: shrink,
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  </>;
};

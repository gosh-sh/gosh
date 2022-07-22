import { FunctionComponent } from "react";
import styles from './Skeleton.module.scss';
import classnames from "classnames/bind";

const cn = classnames.bind(styles);

export interface SkeletonProps {
  size?: "large" | "normal",
  wide?: "half" | "triplet" | "normal",
  variant?:  "primary" | "normal" | "green" | "red",
  amount?: number,
  className?: string
}

export const Skeleton: FunctionComponent<SkeletonProps> = ({
  className,
  size = "normal",
  variant = "normal",
  wide = "normal"
}) => {
  return <div className={cn(
    className,
    "skeleton",
    "skeleton-"+variant,
    "skeleton-height-"+size,
    wide ? "skeleton-width-"+wide : null
)}/>;
};

export default Skeleton;
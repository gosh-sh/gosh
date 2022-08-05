import { FunctionComponent } from "react";

import styles from "./Loader.module.scss";
import classnames from "classnames/bind";

const cn = classnames.bind(styles);

export const LoaderDotsText:FunctionComponent<{className?: string}> = ({className}) => (
  <span className={cn("loader-dots-text", className)}>
    <span>.</span>
    <span>.</span>
  </span>
);
export default LoaderDotsText;

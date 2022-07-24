import { FunctionComponent } from "react";

import styles from "./Loader.module.scss";
import classnames from "classnames/bind";

const cn = classnames.bind(styles);

export const LoaderDots:FunctionComponent<{className?: string}> = ({className}) => (
  <div className={cn("loader-dots", className)}>
    <div></div>
    <div></div>
    {/* <div></div> */}
  </div>
);
export default LoaderDots;

import { FunctionComponent } from "react";

import styles from "./Loader.module.scss";
import classnames from "classnames/bind";

const cn = classnames.bind(styles);

export const Loader = ({className}: {className?: string}) => (
  <svg className={cn("loader", className)} viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="12"></circle>
  </svg>
);
export default Loader;

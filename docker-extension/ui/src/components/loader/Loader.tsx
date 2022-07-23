import { FunctionComponent } from "react";
import * as CSS from 'csstype';

import styles from "./Loader.module.scss";
import classnames from "classnames/bind";

const cn = classnames.bind(styles);

export const Loader = ({className, style}: {className?: string, style?: CSS.Properties<string | number, string & {}>}) => (
  <svg className={cn("loader", className)} viewBox="0 0 40 40" style={style}>
    <circle cx="20" cy="20" r="12" style={style}></circle>
  </svg>
);
export default Loader;

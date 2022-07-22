import { FunctionComponent } from "react";
import styles from "./Panel.module.scss";
import classnames from "classnames/bind";

const cn = classnames.bind(styles);

export const Panel: FunctionComponent<{
  className?: string,
  type?: string,
  children?: React.ReactNode,
  header?: React.ReactNode
}> = ({ className = "", type, children, header}) => {
  return <div className={cn("panel", className)}>
    {header && <div className={cn("panel-header", "head-narrow head-narrow-note")}>
      {header}
    </div>}
    <div className={cn("panel-body")}>
      {children}
    </div>
  </div>;
};

export default Panel;

import { FunctionComponent, ReactNode, useEffect } from "react";
import { Panel } from "../";

import styles from "./ModalSheet.module.scss";
import classnames from "classnames/bind";

const cnb = classnames.bind(styles);

interface ModalSheetProps {
  show: boolean,
  onHide?: () => void,
  className?: string,
  header?: ReactNode,
  [key: string]: any
}

export const ModalSheet: FunctionComponent<ModalSheetProps> = ({
  show,
  onHide,
  className,
  header,
  children,
  ...props
}) => {

  useEffect(() => {
    if (show && onHide) onHide()
  }, [show])
  
  return (
    <Panel
    className={cnb("modal-sheet", className, {active: show})}
    header={header}
  >
    {children}
  </Panel>
  );
};

export default ModalSheet;

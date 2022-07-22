import { FunctionComponent, ReactNode } from "react";
import { Toast as ToastBootstrap, ToastContainer } from "react-bootstrap";
import styles from "./Toast.module.scss";
import classnames from "classnames/bind";
import { Icon, FlexContainer, Flex } from "../";
import { isMobile } from "react-device-detect";

const cn = classnames.bind(styles);

export const Toast: FunctionComponent<{
  className?: string,
  icon?: React.ReactNode,
  children?: React.ReactNode,
  header?: React.ReactNode,
  variant?: "primary" | "light" | "dark",
  qrcode?: ReactNode,
  close: boolean,
  show: boolean,
  onClose: any,
}> = ({ className = "", children, header, variant = "primary", show, qrcode, close, onClose}) => {
  return <ToastContainer className={cn("toast-container", "position-fixed", "p-4")} position={'bottom-end'}>
    <ToastBootstrap show={show} onClose={onClose} className={cn(className, "toast", "toast-"+variant)}>
      <FlexContainer
        align="stretch"
      >
        {qrcode && !isMobile && <Flex
          grow={0}
        >
          <div className={cn("qr-code")}>{qrcode}</div>
        </Flex>}
        <Flex
          grow={1}
          shrink={0}
        >
          <ToastBootstrap.Header className={cn("toast-header")} closeButton={false}>
            {header}{close && <button onClick={() => onClose()}><Icon icon="close"/></button>}
          </ToastBootstrap.Header>
          <ToastBootstrap.Body className={cn("toast-body")}>{children}</ToastBootstrap.Body>
        </Flex>
      </FlexContainer>
    </ToastBootstrap>
  </ToastContainer>
};

export default Toast;

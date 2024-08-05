import classNames from "classnames";
import { forwardRef } from "react";

export type TTagProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  disabled?: boolean;
};

const Tag = forwardRef<HTMLButtonElement, TTagProps>(
  (props: TTagProps, ref) => {
    const { className, disabled, onClick, children, ...rest } = props;

    return (
      <button
        className={classNames(className)}
        {...rest}
        ref={ref}
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </button>
    );
  },
);

export { Tag };
export default Tag;

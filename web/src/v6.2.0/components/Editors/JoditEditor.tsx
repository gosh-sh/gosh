import { useRef } from 'react';
import JoditReact from 'jodit-react';
import { Config } from 'jodit/config';

type DeepPartial<T> = T extends object
	? {
			[P in keyof T]?: DeepPartial<T[P]>;
	  }
	: T;

  export type TJoditEditorPanelProps = {
    language?: string
    value?: string
    className?: string
    disabled?: boolean
    editorClassName?: string
    onChange?(value: string | undefined): void
    config?: DeepPartial<Config>
  }

export const JoditEditor = ({config, className, value, onChange, ...rest}: TJoditEditorPanelProps) => {
	const editor = useRef(null);

	return (
		<JoditReact
      className={`${className} !border-none`}
			ref={editor}
			value={value || ""}
			config={config}
			onBlur={onChange} // preferred to use only this option to update the content for performance reasons
      {...rest}
		/>
	);
};

export default JoditEditor
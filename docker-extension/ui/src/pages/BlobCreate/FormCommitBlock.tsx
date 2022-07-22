
import { Field } from "formik";
import { Link } from "react-router-dom";
import { classNames } from "../../utils";
import { Loader} from "../../components";

import InputBase from '@mui/material/InputBase';
import Button from '@mui/material/Button';

import styles from './BlobCreate.module.scss';
import classnames from "classnames/bind";

const cnb = classnames.bind(styles);

type TFormCommitBlockProps<T> = {
    values?: T,
    urlBack?: string;
    className?: string;
    isDisabled?: boolean;
    isSubmitting?: boolean;
    extraFields?: any;
    extraButtons?: any;
}

const FormCommitBlock = <T extends {title: string}, >(props: TFormCommitBlockProps<T>) => {
    const { urlBack, className, isDisabled, isSubmitting, extraFields, extraButtons, values } = props;

    return (
        <div>
            <h3>Commit data</h3>
            <div>

                <InputBase
                    name="title"
                    className={cnb("input-field", "input")}
                    type="text"
                    placeholder="Commit title"
                    autoComplete='off'
                    value={values?.title}
                />
            </div>
            <div>

                <InputBase
                    multiline={true}
                    name="message"
                    className={cnb("input-field", "input", "textarea")}
                    type="text"
                    placeholder="Commit optional description"
                    autoComplete='off'
                />
            </div>

            {extraFields}

            <div>

                    <Button
                      color="primary"
                      variant="contained"
                      size="large"
                      className={cnb("button-submit", "btn-icon")}
                      type="submit"
                      disableElevation
                      disabled={isSubmitting}
                      // icon={<Icon icon={"arrow-up-right"}/>}
                      // iconAnimation="right"
                      // iconPosition="after"
                  >{isSubmitting && <Loader/>} Commit changes</Button>

                
                {urlBack && (
                    <Link
                        to={urlBack}
                    >
                        
                    <Button
                      color="primary"
                    //   variant="contained"
                      size="large"
                      className={"btn-icon"}
                      disableElevation
                      // icon={<Icon icon={"arrow-up-right"}/>}
                      // iconAnimation="right"
                      // iconPosition="after"
                  >Cancel</Button>
                    </Link>
                )}
                {extraButtons}
            </div>
        </div>
    );
}

export default FormCommitBlock;

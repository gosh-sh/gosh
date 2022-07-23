
import { Field } from "formik";
import { useNavigate } from "react-router-dom";

import { classNames } from "../../utils";
import { Loader} from "../../components";

import InputBase from '@mui/material/InputBase';
import Button from '@mui/material/Button';

import styles from './PullCreate.module.scss';
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
    const navigate = useNavigate();
    const { urlBack, className, isDisabled, isSubmitting, extraFields, extraButtons, values } = props;

    return (
        <div>
            <h3>Commit data</h3>
            <div>

                <InputBase
                    name="title"
                    className={cnb("input-field", "input")}
                    type="text"
                    placeholder='Commit title'
                    disabled={isSubmitting || isDisabled}
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
                    disabled={isSubmitting || isDisabled}
                    autoComplete='off'
                />
            </div>

        {console.log(extraFields)}
            {extraFields}

            <div>

                    <Button
                      color="primary"
                      variant="contained"
                      size="large"
                      className={cnb("button-submit", "btn-icon")}
                      type="submit"
                      disableElevation
                      disabled={isSubmitting || isDisabled}
                      // icon={<Icon icon={"arrow-up-right"}/>}
                      // iconAnimation="right"
                      // iconPosition="after"
                  >{isSubmitting && <Loader/>} Commit changes</Button>

                
                {urlBack && (

                        
                    <Button
                      color="primary"
                      size="large"
                      className={"btn-icon"}
                      disableElevation
                      disabled={isSubmitting}
                      onClick={() => navigate(urlBack)}

                  >Cancel</Button>
                )}
                {extraButtons}
            </div>
        </div>
    );
}

export default FormCommitBlock;

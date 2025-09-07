import * as React from "react";
import styles from "./styles.module.scss";

function Input(
    {
        className,
        ...props
    }: React.ComponentProps<'input'>
) {
    return <input className={`${styles.input} ${className || ""}`} {...props} />;
}

export {
    Input,
};

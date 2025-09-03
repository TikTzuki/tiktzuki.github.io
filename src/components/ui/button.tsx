import * as React from "react";
import styles from "./styles.module.scss";

function Button({
                    className,
                    ...props
                }: React.ComponentProps<"button">) {
    return (
        <button
            data-slot="button"
            className={`${styles.button} ${className || ""}`}
            {...props}
        />
    );
}

export { Button };

import * as React from "react";
import styles from "./styles.module.scss";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
      <div
          data-slot="card"
          className={`${styles.card} ${className || ""}`}
          {...props}
      />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
      <div
          data-slot="card-header"
          className={`${styles.cardHeader} ${className || ""}`}
          {...props}
      />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
      <div
          data-slot="card-title"
          className={`${styles.cardTitle} ${className || ""}`}
          {...props}
      />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
      <div
          data-slot="card-description"
          className={`${styles.cardDescription} ${className || ""}`}
          {...props}
      />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
      <div
          data-slot="card-action"
          className={`${styles.cardAction} ${className || ""}`}
          {...props}
      />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
      <div
          data-slot="card-content"
          className={`${styles.cardContent} ${className || ""}`}
          {...props}
      />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
      <div
          data-slot="card-footer"
          className={`${styles.cardFooter} ${className || ""}`}
          {...props}
      />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};

import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string };

export function AccountFormField({ label, hint, id, ...props }: Props) {
  return <label className="account-form-field" htmlFor={id}><span>{label}</span>{hint && <small>{hint}</small>}<input id={id} {...props} /></label>;
}

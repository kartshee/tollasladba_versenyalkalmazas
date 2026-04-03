import { InfoHint } from './InfoHint.jsx';

export function FormField({ label, htmlFor, hintTitle, hintText, children, helpText }) {
  return (
    <label className="form-field" htmlFor={htmlFor}>
      <span className="form-field__label-row">
        <span className="form-field__label">{label}</span>
        {hintText ? <InfoHint title={hintTitle ?? label} text={hintText} /> : null}
      </span>
      {children}
      {helpText ? <span className="form-field__help">{helpText}</span> : null}
    </label>
  );
}

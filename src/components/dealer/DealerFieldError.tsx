import * as React from 'react';

/**
 * Shared inline validation error for dealer portal forms.
 *
 * Reference design: a red bullet, bold red text, sitting directly under the
 * field it belongs to. Keep this the only way dealer forms show field errors
 * so every page reads the same way.
 */
type Props = {
  id?: string;
  className?: string;
  children: React.ReactNode;
};

export const DealerFieldError: React.FC<Props> = ({ id, className, children }) => (
  <p
    id={id}
    role="alert"
    className={`mt-1.5 flex items-start gap-1.5 text-sm font-bold leading-snug text-destructive ${className ?? ''}`}
  >
    <span aria-hidden="true">
      &bull;
    </span>
    <span>{children}</span>
  </p>
);

export default DealerFieldError;

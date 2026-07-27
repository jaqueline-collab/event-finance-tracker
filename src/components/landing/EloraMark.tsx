import type { SVGProps } from "react";

/**
 * Marca do EloraCRM: bolha de conversa com um brilho (spark),
 * representando atendimento + automação inteligente.
 */
export function EloraMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M32 8C18.7 8 8 17.2 8 28.6c0 6.4 3.4 12.1 8.8 15.9v9.9c0 1.3 1.5 2 2.5 1.2l8.4-6.4c1.4.2 2.8.3 4.3.3 13.3 0 24-9.2 24-20.9C56 17.2 45.3 8 32 8z" />
      <path
        d="M32 17.5l2.9 7.4 7.6 2.7-7.6 2.7L32 37.7l-2.9-7.4-7.6-2.7 7.6-2.7L32 17.5z"
        fill="var(--color-landing-dark)"
        opacity="0.85"
      />
    </svg>
  );
}

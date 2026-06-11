import type { SVGProps } from "react";

/**
 * Patinha estilizada — usada como marca do EloraCRM.
 * Cor herda de `currentColor` para combinar com qualquer fundo.
 */
export function PawLogo({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Almofada principal */}
      <path d="M32 36c-9 0-16 6.2-16 13.4 0 5 3.6 8.6 8.4 8.6 3 0 4.7-1.2 7.6-1.2s4.6 1.2 7.6 1.2c4.8 0 8.4-3.6 8.4-8.6C48 42.2 41 36 32 36z" />
      {/* Dedos superiores */}
      <ellipse cx="22" cy="22" rx="5" ry="7" />
      <ellipse cx="42" cy="22" rx="5" ry="7" />
      {/* Dedos laterais */}
      <ellipse cx="10" cy="34" rx="5" ry="6.5" />
      <ellipse cx="54" cy="34" rx="5" ry="6.5" />
    </svg>
  );
}
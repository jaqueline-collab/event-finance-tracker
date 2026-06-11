import type { SVGProps } from "react";

/**
 * Patinha de gato com garrinhas à mostra — marca do EloraCRM.
 * Cor herda de `currentColor`. Proporção ajustada para combinar
 * em altura com a wordmark "EloraCRM" (sem dominar).
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
      <path d="M32 34c-8.2 0-14.5 5.6-14.5 12.2 0 4.5 3.2 7.8 7.6 7.8 2.7 0 4.3-1.1 6.9-1.1s4.2 1.1 6.9 1.1c4.4 0 7.6-3.3 7.6-7.8C46.5 39.6 40.2 34 32 34z" />
      {/* Dedinho central-esq */}
      <g>
        <ellipse cx="24" cy="22" rx="4.2" ry="5.6" />
        {/* garrinha */}
        <path d="M21.5 16.5 Q22 13 23.2 15.2 Z" />
      </g>
      {/* Dedinho central-dir */}
      <g>
        <ellipse cx="40" cy="22" rx="4.2" ry="5.6" />
        <path d="M42.5 16.5 Q42 13 40.8 15.2 Z" />
      </g>
      {/* Dedinho lateral esq */}
      <g>
        <ellipse cx="13" cy="30" rx="4" ry="5.2" />
        <path d="M10.5 25 Q10.8 22 12 24.4 Z" />
      </g>
      {/* Dedinho lateral dir */}
      <g>
        <ellipse cx="51" cy="30" rx="4" ry="5.2" />
        <path d="M53.5 25 Q53.2 22 52 24.4 Z" />
      </g>
    </svg>
  );
}
import type { SVGProps } from "react";

/**
 * Patinha de gato — marca do EloraCRM.
 * Estilo "cartoon limpo": almofada central + 4 dedinhos com unhinhas curtas.
 * Desenhada no viewBox quadrado com os elementos compactados verticalmente
 * para alinhar opticamente com a x-height da wordmark "EloraCRM".
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
      <path d="M32 30c-9 0-16 6-16 13.2 0 5 3.6 8.8 8.6 8.8 3 0 4.8-1.2 7.4-1.2s4.4 1.2 7.4 1.2c5 0 8.6-3.8 8.6-8.8C48 36 41 30 32 30z" />
      {/* Dedos: 4 elipses + 4 unhinhas curtas */}
      <g>
        <ellipse cx="20" cy="20" rx="4.6" ry="5.8" />
        <path d="M17.6 13.6c.3-1.6 1.7-1.6 2 0 .2 1-.4 1.6-1 1.6s-1.2-.6-1-1.6z" />
      </g>
      <g>
        <ellipse cx="32" cy="16" rx="4.6" ry="5.8" />
        <path d="M29.6 9.6c.3-1.6 1.7-1.6 2 0 .2 1-.4 1.6-1 1.6s-1.2-.6-1-1.6z" />
      </g>
      <g>
        <ellipse cx="44" cy="20" rx="4.6" ry="5.8" />
        <path d="M41.6 13.6c.3-1.6 1.7-1.6 2 0 .2 1-.4 1.6-1 1.6s-1.2-.6-1-1.6z" />
      </g>
      <g>
        <ellipse cx="54" cy="30" rx="4.2" ry="5.2" />
        <path d="M51.8 24c.3-1.5 1.6-1.5 1.9 0 .2 1-.4 1.5-.95 1.5S51.6 25 51.8 24z" />
      </g>
    </svg>
  );
}
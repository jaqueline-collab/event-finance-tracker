import type { SVGProps } from "react";

/**
 * Silhueta de gatinho sentado esticando a patinha — usada no rodapé
 * "alcançando" o E de EloraCRM.
 */
export function CatReaching({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 120 90"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M70 18 L74 6 L80 16 C84 14 88 14 92 16 L98 6 L102 18 C108 24 110 32 108 40 L106 46 C112 44 116 40 118 36 C116 42 112 47 106 50 L104 60 C104 70 100 78 92 82 L40 82 C30 82 24 78 22 70 C20 62 24 56 32 54 L34 50 C30 46 28 40 30 34 C32 26 38 22 46 22 C54 22 62 22 70 18 Z M40 82 L36 88 L42 88 L44 82 Z M80 82 L78 88 L84 88 L84 82 Z M22 70 L14 76 L20 78 L24 74 Z" />
      {/* olhinho */}
      <circle cx="92" cy="22" r="1.2" fill="#fff" opacity="0.9" />
    </svg>
  );
}
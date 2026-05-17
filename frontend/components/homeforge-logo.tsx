'use client';

import Image from 'next/image';

interface HomeForgeLogoProps {
  size?: number;
  className?: string;
}

export function HomeForgeLogo({ size = 48, className = '' }: HomeForgeLogoProps) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      {/* Dark mode: colorful logo */}
      <Image
        src="/logos/homeforge-v2-color.svg"
        alt="HomeForge"
        width={size}
        height={size}
        className="object-contain dark:block hidden"
        style={{ width: size, height: size }}
        priority
      />
      {/* Light mode: primary-colored mask */}
      <div
        className="dark:hidden block bg-primary"
        style={{
          width: size,
          height: size,
          maskImage: 'url("/logos/homeforge-v2-bw.svg")',
          maskSize: 'contain',
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskImage: 'url("/logos/homeforge-v2-bw.svg")',
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          WebkitMaskSize: 'contain',
        }}
      />
    </div>
  );
}

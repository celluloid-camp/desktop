type LogoProps = {
  className?: string;
  height?: number;
};

/** Celluloid logo mark from apps/web/public/logo.svg */
export function Logo({ className, height = 28 }: LogoProps) {
  const width = Math.round((height * 60) / 28);
  return (
    <img
      src="/logo.svg"
      alt="Celluloid"
      width={width}
      height={height}
      className={className}
      draggable={false}
    />
  );
}

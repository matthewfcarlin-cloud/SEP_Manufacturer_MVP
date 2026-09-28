import Image from "next/image";
import logoNight from "@/public/brand/moko-logo-night.png";
import logo from "@/public/brand/moko-logo.png";

/** The Moko wordmark: dark ink on light surfaces, the night version in dark mode. */
export function Logo({ className = "h-6 w-auto", priority = false }: { className?: string; priority?: boolean }) {
  return (
    <>
      <Image src={logo} alt="Moko" priority={priority} className={`${className} dark:hidden`} />
      <Image src={logoNight} alt="Moko" priority={priority} className={`${className} hidden dark:block`} />
    </>
  );
}

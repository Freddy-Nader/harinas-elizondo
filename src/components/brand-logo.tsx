import Image from "next/image";
import logo from "../../public/harinas-elizondo.png";

export function BrandLogo({ className }: { className: string }) {
  return (
    <span className={`block rounded-lg dark:bg-white ${className}`}>
      <Image src={logo} alt="" className="h-auto w-full" />
    </span>
  );
}

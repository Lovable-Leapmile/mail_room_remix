import cubeAsset from "@/assets/cube-mailroom.png.asset.json";
import podAsset from "@/assets/pod-mailroom.png.asset.json";
import { cn } from "@/lib/utils";

export function StorageIcon({
  type,
  className,
  imgClassName,
}: {
  type: "robot" | "locker";
  className?: string;
  imgClassName?: string;
}) {
  const src = type === "robot" ? cubeAsset.url : podAsset.url;
  const alt = type === "robot" ? "Cube Robot" : "Smart Locker";
  return (
    <div
      className={cn(
        "rounded-2xl bg-[color:var(--primary-soft)] flex items-center justify-center shrink-0 overflow-hidden",
        className,
      )}
    >
      <img src={src} alt={alt} className={cn("object-contain", imgClassName)} />
    </div>
  );
}

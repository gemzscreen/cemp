// Profile picture (data URL) or initials.
import { initials } from "@/lib/names";

export default function Avatar({ name, src, size = 30 }: { name: string; src?: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) };
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img className="avatar pic" src={src} alt="" style={style} /> : <span className="avatar" style={style} aria-hidden>{initials(name)}</span>;
}

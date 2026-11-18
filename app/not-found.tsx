import Link from "next/link";
export default function NotFound() {
  return <main className="wrap"><div className="empty"><strong>Not found.</strong><Link href="/">Back to dashboard</Link></div></main>;
}

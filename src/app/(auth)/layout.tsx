export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth screens own their full-page split layout.
  return children;
}

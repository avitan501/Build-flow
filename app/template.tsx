export default function Template({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="page-enter-motion">{children}</div>;
}

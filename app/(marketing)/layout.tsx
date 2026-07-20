export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="home-viewport fixed inset-0 overflow-hidden overscroll-none">
      {children}
    </div>
  );
}

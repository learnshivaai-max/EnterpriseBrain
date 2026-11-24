import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "EnterpriseBrain | Nexora Global",
  description: "See the invisible connections that power your enterprise.",
};

export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

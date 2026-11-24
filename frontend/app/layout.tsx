import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Threadatlas | Nexora Global",
  description: "See how your enterprise fits together.",
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

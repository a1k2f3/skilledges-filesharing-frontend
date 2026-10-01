import type { Metadata } from "next";
import "./globals.css";
import "./notifications.css";

export const metadata: Metadata = {
  title: "Skills Edge | Embroidery Operations",
  description: "A focused workspace for embroidery digitizing teams.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en"><body>{children}</body></html>
  );
}

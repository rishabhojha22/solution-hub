import type { Metadata } from "next";
import "./globals.css";
import "./knowledge-graph.css";

export const metadata: Metadata = { title: "Bosch Solution Hub", description: "Find before you build." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

import type { Metadata } from "next";
import { TRPCProvider } from "../lib/trpc-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "CFP Help - Conference Proposal Generator",
  description: "Generate compelling CFP proposals for your conference submissions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}

// src/app/layout.js
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Hording Map",
  description: "B2B outdoor media planning and inventory intelligence platform.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* Add dark mode base classes to the body */}
      <body className={`${inter.className} bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200`}>
        {children}
      </body>
    </html>
  );
}
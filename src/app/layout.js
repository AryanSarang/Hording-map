// src/app/layout.js
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "medvar",
  description: "AI-powered media planning platform for smarter location-first campaign decisions.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* Add dark mode base classes to the body */}
      <body className={`${inter.className} bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200`}>
        {children}
        <Toaster
          richColors
          theme="dark"
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast:
                "bg-[#0f1115] border border-gray-800 text-white shadow-xl",
              title: "text-sm font-medium",
              description: "text-xs font-normal text-gray-300",
              actionButton:
                "bg-green-600 hover:bg-green-500 text-black text-xs font-normal",
              cancelButton:
                "bg-gray-900 border border-gray-700 text-gray-200 text-xs font-normal",
            },
          }}
        />
      </body>
    </html>
  );
}
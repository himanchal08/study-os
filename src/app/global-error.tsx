"use client";

import Link from "next/link";
import { useState, useTransition, useEffect } from "react";
import { reportError } from "@/app/actions/error-reporting";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [reported, setReported] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    console.error(error);
  }, [error]);

  const handleReport = () => {
    startTransition(async () => {
      await reportError(error.digest || "Unknown", message);
      setReported(true);
    });
  };

  return (
    <html lang="en">
      <body className="min-h-dvh flex flex-col items-center justify-center p-6 bg-black text-neutral-200 font-sans">
        <div className="max-w-md w-full glass p-8 rounded-2xl flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-6">
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-white">Fatal Error</h2>
          <p className="text-neutral-400 text-sm mb-8">
            A critical error occurred at the application root.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full mb-6">
            <button
              onClick={() => reset()}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all bg-neutral-800 hover:bg-neutral-700 text-white"
            >
              Try again
            </button>
            <Link
              href="/"
              className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center"
            >
              Reload App
            </Link>
          </div>
          
          <div className="w-full pt-6 border-t border-neutral-800 text-left">
            {reported ? (
              <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-lg text-sm flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Error reported successfully. Thank you!
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-neutral-300 font-medium">Help us fix this</p>
                <textarea 
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="What were you doing when this happened? (optional)"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none h-20"
                />
                <button
                  onClick={handleReport}
                  disabled={isPending}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isPending ? "Sending..." : "Submit Error Report"}
                </button>
              </div>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}

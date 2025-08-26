'use client';

import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          <h1 className="mb-4 text-3xl font-bold text-gray-900">Access Denied</h1>
          <p className="mb-6 text-gray-600">
            You don&apos;t have permission to access this page. Please contact an administrator if you believe this is an error.
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => router.push('/')}
              className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

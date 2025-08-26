'use client';

import { useAuth } from '@/lib/auth';
import { useState } from 'react';

export default function LoginPage() {
    const { login } = useAuth();
    const [role, setRole] = useState<'admin' | 'employee'>('employee');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string>();
    const [isLoading, setIsLoading] = useState(false);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(undefined);
        setIsLoading(true);

        try {
            await login(email, password, role);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="relative min-h-screen antialiased overflow-hidden">
            {/* Animated gradient background */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(255,255,255,0.25)_0%,rgba(255,255,255,0)_70%)]" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-violet-700 via-indigo-700 to-cyan-600" />

            {/* Ambient blobs */}
            <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-pulse" />
            <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl animate-[pulse_9s_ease-in-out_infinite]" />

            {/* Page shell */}
            <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
                <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/10 shadow-[0_10px_50px_-10px_rgba(0,0,0,0.4)] backdrop-blur-xl">
                    {/* Card header */}
                    <div className="p-6">
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl font-semibold tracking-tight text-white">
                                Welcome back
                            </h1>
                        </div>
                        <p className="mt-1 text-sm text-white/70">
                            Choose your role and continue securely.
                        </p>
                    </div>

                    {/* Divider */}
                    <div className="mx-6 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                    {/* Form */}
                    <form onSubmit={onSubmit} className="p-6 space-y-5">
                        {/* Role segmented control */}
                        <fieldset>
                            <legend className="mb-2 block text-sm font-medium text-white/90">Role</legend>
                            <div className="inline-flex w-full rounded-xl bg-white/10 p-1 ring-1 ring-inset ring-white/20" role="tablist" aria-label="Choose your role">
                                {(['employee', 'admin'] as const).map((r) => {
                                    const active = role === r;
                                    return (
                                        <button
                                            key={r}
                                            type="button"
                                            role="tab"
                                            aria-selected={active}
                                            onClick={() => setRole(r)}
                                            className={[
                                                'flex-1 rounded-lg px-3 py-2 text-sm transition',
                                                active
                                                    ? 'bg-white text-slate-900 shadow-sm'
                                                    : 'text-white/80 hover:text-white hover:bg-white/10',
                                            ].join(' ')}
                                        >
                                            {r === 'admin' ? 'Admin' : 'Employee'}
                                        </button>
                                    );
                                })}
                            </div>
                        </fieldset>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-white/90" htmlFor="email">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className="w-full rounded-xl border-0 bg-white/10 px-3 py-2 text-white placeholder-white/50 shadow-inner outline-none ring-1 ring-inset ring-white/20 focus:ring-2 focus:ring-white/40"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-white/90" htmlFor="password">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full rounded-xl border-0 bg-white/10 px-3 py-2 text-white placeholder-white/50 shadow-inner outline-none ring-1 ring-inset ring-white/20 focus:ring-2 focus:ring-white/40"
                            />
                        </div>



                        {/* Alerts */}
                        {error && (
                            <div className="rounded-xl border border-rose-300/40 bg-rose-100/20 px-3 py-2 text-sm text-rose-50">
                                {error}
                            </div>
                        )}

                        {/* CTA */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative inline-flex w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-white/60 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="absolute inset-0 -z-10 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-60 bg-gradient-to-r from-fuchsia-400 via-violet-400 to-cyan-300" />
                            {isLoading ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            ) : null}
                            Continue
                        </button>
                    </form>

                    {/* Subtle footer */}
                    <div className="pb-6 px-6">
                        <p className="text-center text-xs text-white/60">
                            By continuing you agree to our Terms & Privacy.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}

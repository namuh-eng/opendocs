interface DocsPasswordGateProps {
  subdomain: string;
  error?: string;
}

export function DocsPasswordGate({ subdomain, error }: DocsPasswordGateProps) {
  return (
    <main className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center px-6">
      <form
        action={`/api/docs/${subdomain}/auth`}
        method="post"
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl"
      >
        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-300/80">
            Protected docs
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Enter password</h1>
          <p className="mt-2 text-sm text-gray-400">
            This documentation site is password-protected.
          </p>
        </div>
        <input type="hidden" name="returnTo" value={`/docs/${subdomain}`} />
        <label className="block text-sm font-medium text-gray-200">
          Password
          <input
            className="mt-2 w-full rounded-lg border border-white/10 bg-[#151515] px-3 py-2 text-white outline-none focus:border-emerald-400"
            name="password"
            type="password"
            required
          />
        </label>
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        <button
          className="mt-5 w-full rounded-lg bg-emerald-500 px-4 py-2 font-medium text-black hover:bg-emerald-400"
          type="submit"
        >
          Continue
        </button>
      </form>
    </main>
  );
}

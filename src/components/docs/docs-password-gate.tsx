interface DocsPasswordGateProps {
  subdomain: string;
  error?: string;
}

export function DocsPasswordGate({ subdomain, error }: DocsPasswordGateProps) {
  return (
    <main className="min-h-screen bg-[#110f1d] text-[#f4f1e6] flex items-center justify-center px-6">
      <form
        action={`/api/docs/${subdomain}/auth`}
        method="post"
        className="w-full max-w-sm rounded-2xl border border-[#f4f1e6]/10 bg-[#f4f1e6]/[0.03] p-6 shadow-2xl"
      >
        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.25em] text-[#9baaf0]/80">
            Protected docs
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Enter password</h1>
          <p className="mt-2 text-sm text-[#a8a3b8]">
            This documentation site is password-protected.
          </p>
        </div>
        <input type="hidden" name="returnTo" value={`/docs/${subdomain}`} />
        <label className="block text-sm font-medium text-[#f4f1e6]/90">
          Password
          <input
            className="mt-2 w-full rounded-lg border border-[#f4f1e6]/10 bg-[#1a1827] px-3 py-2 text-[#f4f1e6] outline-none focus:border-[#7b8fde]"
            name="password"
            type="password"
            required
          />
        </label>
        {error && <p className="mt-3 text-sm text-[#e08a76]">{error}</p>}
        <button
          className="mt-5 w-full rounded-full bg-[#6b7fd7] px-4 py-2 font-medium text-white hover:bg-[#5466c2]"
          type="submit"
        >
          Continue
        </button>
      </form>
    </main>
  );
}

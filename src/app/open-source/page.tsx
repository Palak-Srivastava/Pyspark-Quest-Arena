import Link from "next/link";

const repoUrl = process.env.NEXT_PUBLIC_GITHUB_REPO_URL ?? "";
const issueUrl = repoUrl ? `${repoUrl.replace(/\/$/, "")}/issues/new/choose` : "";

export default function OpenSourcePage() {
  return (
    <section className="space-y-5">
      <header className="panel rounded-3xl p-6">
        <h1 className="headline text-3xl font-semibold text-white">Open Source & Community</h1>
        <p className="mt-2 text-slate-300">
          Found a bug? Report it. Want to improve a challenge? Open a pull request and help other learners.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="panel rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white">Report a bug</h2>
          <p className="mt-2 text-sm text-slate-300">
            Share reproduction steps, expected behavior, and screenshots if possible.
          </p>
          {issueUrl ? (
            <a
              href={issueUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex rounded-lg border border-rose-300/35 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-100"
            >
              Open GitHub issue
            </a>
          ) : (
            <p className="mt-4 text-xs text-amber-200">
              Set NEXT_PUBLIC_GITHUB_REPO_URL in environment to enable one-click bug reporting.
            </p>
          )}
        </article>

        <article className="panel rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white">Contribute a fix</h2>
          <p className="mt-2 text-sm text-slate-300">Read contribution guidelines and submit PRs with tests/screenshots.</p>
          {repoUrl ? (
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex rounded-lg border border-emerald-300/35 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-100"
            >
              Open repository
            </a>
          ) : (
            <p className="mt-4 text-xs text-amber-200">Set NEXT_PUBLIC_GITHUB_REPO_URL to show repository link.</p>
          )}
        </article>
      </section>

      <section className="panel rounded-2xl p-5">
        <h3 className="text-white font-semibold">Contribution quick steps</h3>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-300">
          <li>Fork repo and create a branch.</li>
          <li>Fix issue or improve content quality.</li>
          <li>Run build and sanity checks locally.</li>
          <li>Submit PR with clear before/after notes.</li>
        </ol>
        <div className="mt-4">
          <Link href="/arena" className="text-sm font-semibold text-sky-200 hover:text-sky-100">
            Continue practicing →
          </Link>
        </div>
      </section>
    </section>
  );
}

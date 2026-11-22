import { ArrowUpRight, Search } from "lucide-react";
import { Form, Link, data, useNavigation, useSubmit } from "react-router";
import { listResources, searchResources, type Resource } from "~/services/resources.server";
import type { Route } from "./+types/_index";

// The resource library: every resource Work Health CoLab has approved, with
// search. The list comes ready from the server, and the search box is a plain
// form (?q=…), so the page works before, or without, JavaScript.

const CONTACT_EMAIL = "info@workhealthcolab.com";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Resource library · Work Health CoLab" },
    {
      name: "description",
      content: "Services and information for staying at work, or getting back to it, reviewed by Work Health CoLab.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  try {
    const all = await listResources();
    return { q, total: all.length, resources: searchResources(all, q), unavailable: false };
  } catch (error) {
    console.error("[resources] couldn't read the library", error);
    return data({ q, total: 0, resources: [] as Resource[], unavailable: true }, { status: 503 });
  }
}

// Tile colors, in turn down the list.
const TILES = ["bg-brand-soft text-brand", "bg-sky-bg text-sky-fg", "bg-warm-bg text-warm-fg"];

export default function Library({ loaderData }: Route.ComponentProps) {
  const { q, total, resources, unavailable } = loaderData;
  const submit = useSubmit();
  const searching = useNavigation().state === "loading";
  const noun = total === 1 ? "resource" : "resources";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="relative overflow-hidden bg-brand text-white">
        <Decoration />
        <div className="relative mx-auto max-w-[1080px] px-6">
          <div className="flex min-h-[72px] flex-wrap items-center justify-between gap-3">
            <Link to="/" className="flex min-h-11 items-center gap-2.5">
              <img src="/colab-logo.png" alt="" className="size-[34px] rounded-[9px] bg-white" />
              <span className="text-[17px] font-semibold">Work Health CoLab</span>
            </Link>
            <a
              href="https://workhealthcolab.com"
              className="flex min-h-11 items-center rounded-lg border border-brand-200 px-4 text-[15px] font-semibold hover:bg-brand-mid"
            >
              About CoLab
            </a>
          </div>

          <div className="flex max-w-[700px] flex-col gap-4 pt-10 pb-24 sm:pt-14">
            <p className="self-start rounded-full bg-brand-mid px-3 py-1.5 text-[13px] font-bold tracking-wider text-brand-soft uppercase">
              Resource library
            </p>
            <h1 className="text-[36px] leading-[1.08] font-semibold tracking-tight sm:text-[52px]">
              Help for staying at work, or getting back to it
            </h1>
            <p className="max-w-[580px] text-[18px] leading-relaxed text-brand-soft">
              Services and information our coaches recommend. Every one is checked by Work Health CoLab before it's
              listed.
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto flex max-w-[1080px] flex-col gap-10 px-6 pb-[72px]">
          <Form
            method="get"
            role="search"
            // Search as you type; Enter (or no JavaScript) submits the form the usual way.
            onChange={(event) => submit(event.currentTarget, { replace: true, preventScrollReset: true })}
            className="relative -mt-10 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-white px-6 py-5 shadow-[0_12px_32px_rgba(30,48,66,0.10)]"
          >
            <div className="relative min-w-0 flex-[1_1_360px]">
              <label htmlFor="q" className="sr-only">
                Search resources
              </label>
              <Search size={22} strokeWidth={2.2} aria-hidden className="absolute top-[17px] left-4 text-brand" />
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Search resources, e.g. “benefits” or “accommodation”"
                className="h-14 w-full rounded-[10px] border border-line-strong bg-canvas pr-4 pl-[50px] text-[17px] placeholder:text-ink-muted focus:outline-3 focus:outline-offset-2 focus:outline-brand-200"
              />
            </div>
            <p role="status" className={`text-[15px] font-semibold text-ink-muted ${searching ? "opacity-60" : ""}`}>
              {unavailable ? "" : q ? `${resources.length} of ${total} ${noun}` : `${total} ${noun}`}
            </p>
          </Form>

          {unavailable ? (
            <Notice title="The library can't be loaded right now" text="Please try again in a few minutes." />
          ) : total === 0 ? (
            <Notice title="No resources yet" text="Resources will be listed here as our team approves them." />
          ) : resources.length === 0 ? (
            <Notice title="Nothing matches that search" text="Check the spelling, or try fewer words.">
              <Link
                to="/"
                className="mt-2 inline-flex h-11 items-center rounded-lg border border-line-strong bg-white px-4 text-[15px] font-semibold hover:bg-canvas"
              >
                Clear search
              </Link>
            </Notice>
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
              {resources.map((resource, index) => (
                <ResourceCard key={resource.id} resource={resource} tile={TILES[index % TILES.length]!} />
              ))}
            </ul>
          )}
        </div>
      </main>

      <footer className="bg-ink text-white">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-4 px-6 py-9">
          <div>
            <p className="text-[17px] font-semibold">Know a resource that should be here?</p>
            <p className="mt-1 text-[15px] leading-relaxed text-line-strong">
              Tell your coach, or write to us. Links go to other organizations' websites.
            </p>
          </div>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex min-h-11 items-center rounded-lg bg-white px-[18px] text-[15px] font-semibold text-brand hover:bg-brand-soft"
          >
            {CONTACT_EMAIL}
          </a>
        </div>
      </footer>
    </div>
  );
}

function ResourceCard({ resource, tile }: { resource: Resource; tile: string }) {
  return (
    <li className="flex flex-col gap-3.5 rounded-2xl border border-line bg-white p-6">
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden
          className={`flex size-[52px] flex-none items-center justify-center rounded-[14px] text-[22px] font-bold ${tile}`}
        >
          {resource.host.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h2 className="text-[18px] leading-snug font-semibold">{resource.title}</h2>
          <p className="mt-0.5 truncate text-[14px] font-medium text-ink-muted">{resource.host}</p>
        </div>
      </div>
      {resource.description && <p className="flex-1 text-[16px] leading-relaxed">{resource.description}</p>}
      <a
        href={resource.url}
        target="_blank"
        rel="noreferrer noopener"
        aria-label={`Visit ${resource.title} (opens in a new tab)`}
        className="mt-auto inline-flex min-h-11 items-center gap-2 self-start rounded-lg bg-brand-soft px-4 text-[15px] font-semibold text-brand hover:text-brand-dark"
      >
        Visit website
        <ArrowUpRight size={16} strokeWidth={2.2} aria-hidden />
      </a>
    </li>
  );
}

function Notice({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-white px-6 py-12 text-center">
      <p className="text-[20px] font-semibold">{title}</p>
      <p className="text-[16px] text-ink-muted">{text}</p>
      {children}
    </div>
  );
}

/** The rings behind the heading; decoration only. */
function Decoration() {
  return (
    <svg aria-hidden viewBox="0 0 520 520" className="absolute -top-[140px] -right-[120px] hidden size-[620px] sm:block">
      <circle cx="260" cy="260" r="250" fill="none" stroke="#138E88" strokeWidth="2" />
      <circle cx="260" cy="260" r="190" fill="none" stroke="#138E88" strokeWidth="2" />
      <circle cx="260" cy="260" r="130" fill="#0B7A74" />
      <circle cx="260" cy="260" r="70" fill="#138E88" />
      <circle cx="88" cy="330" r="14" fill="#E6F4F0" />
      <circle cx="438" cy="120" r="9" fill="#9FD8CF" />
    </svg>
  );
}

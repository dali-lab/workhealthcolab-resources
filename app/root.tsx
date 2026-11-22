import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "icon", type: "image/png", href: "/colab-logo.png" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="max-w-md text-center">
        <p className="text-[13px] font-bold tracking-wider text-brand uppercase">Work Health CoLab</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{notFound ? "Page not found" : "Something went wrong"}</h1>
        <p className="mt-2 text-[17px] leading-relaxed text-ink-muted">
          {notFound ? "This page doesn't exist." : "Please try again in a moment."}
        </p>
        <a
          href="/"
          className="mt-6 inline-flex h-11 items-center rounded-lg bg-brand px-4 text-[15px] font-semibold text-white hover:bg-brand-dark"
        >
          Go to the resource library
        </a>
      </div>
    </main>
  );
}

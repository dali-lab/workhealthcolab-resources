import { type RouteConfig } from "@react-router/dev/routes";
import { flatRoutes } from "@react-router/fs-routes";

// File-based routing: every file in app/routes is a page.
export default flatRoutes() satisfies RouteConfig;

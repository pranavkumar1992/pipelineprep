import { redirect } from "next/navigation";

/**
 * The PRD called this "Hall of Fame". The published scenario library already
 * covers the incident walkthroughs, so the route forwards there rather than
 * maintaining a second, near-duplicate index.
 */
export default function IncidentsPage() {
  redirect("/scenarios");
}

import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { roleHomePath } from "@/lib/roles";

// Root just routes to the right place based on session state — there's
// no real "home page" content yet.
export default function Home() {
  const session = getSession();
  redirect(session ? roleHomePath(session.role) : "/login");
}

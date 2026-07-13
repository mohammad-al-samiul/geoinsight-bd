import { redirect } from "next/navigation";

/** Removed from nav — geographic map lives on National Overview. */
export default function MapRedirect() {
  redirect("/");
}

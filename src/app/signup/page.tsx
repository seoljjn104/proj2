import { redirect } from "next/navigation";

/**
 * The standalone create-account page became a popup on the landing page —
 * keep the old URL working by deep-linking to it.
 */
export default function SignupRedirect() {
  redirect("/?auth=signup");
}
import { redirect } from "next/navigation";

/**
 * The standalone sign-in page became a popup on the landing page — keep the
 * old URL working by deep-linking to it.
 */
export default function LoginRedirect() {
  redirect("/?auth=login");
}
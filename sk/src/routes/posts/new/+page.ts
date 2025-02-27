import { redirect } from '@sveltejs/kit';
import { base } from "$app/paths";

export function load() {
  // Redirect to the edit page
  throw redirect(302, `${base}/posts/new/edit`);
}
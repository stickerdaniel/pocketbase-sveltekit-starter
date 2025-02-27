import type { LayoutLoad } from "./$types";
import { client } from "$lib/pocketbase";
import { toast } from "svelte-sonner";

// turn off SSR - we're JAMstack here
export const ssr = false;
// Prerendering turned off. Turn it on if you know what you're doing.
export const prerender = false;
// trailing slashes make relative paths much easier
export const trailingSlash = "always";

export const load: LayoutLoad = async ({ fetch }) => {
  type Metadata = {
    title: string;
    headline?: string;
  };
  let config: {
    site: {
      name: string;
      copyright: string;
      year: number;
    };
    signupAllowed: boolean;
  } = {} as any;
  const title = "Untitled";
  const metadata: Metadata = {
    title,
  };

  try {
    const response = await fetch(client.baseUrl + "/_/");
    if (response.redirected) {
      // We need to wrap this in setTimeout to ensure it runs after Toaster is mounted
      setTimeout(() => {
        toast.error(
          'Please visit <a href="/_/">/_</a> to finalize installation of PocketBase',
          {
            descriptionClassName: "allow-links",
          }
        );
      }, 100);
    }

    config = await client.send("/api/config", { fetch, requestKey: "config" });
  } catch (e: any) {
    // We need to wrap this in setTimeout to ensure it runs after Toaster is mounted
    setTimeout(() => {
      toast.error(e.toString());
    }, 100);
  }
  return {
    config,
    metadata,
  };
};

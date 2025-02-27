import { client } from "$lib/pocketbase";
import type { PostsResponse } from "$lib/pocketbase/generated-types";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
  // Create empty record for the new post form
  const record: PostsResponse = {
    id: "",
    collectionId: "",
    collectionName: "posts",
    created: "",
    updated: "",
    title: "",
    body: "",
    user: "",
    slug: "",
    files: [],
  };

  return {
    record,
    metadata: {
      title: "Create New Post",
      headline: "Create New Post"
    }
  };
};
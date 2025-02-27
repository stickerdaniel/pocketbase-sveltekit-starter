import { toast } from "svelte-sonner";

// This function is being kept for backward compatibility
// but ideally should be replaced with direct try/catch blocks 
// using toast directly in the components that need it
export async function alertOnFailure(request: () => void) {
  try {
    await request();
  } catch (e: any) {
    const {
      message,
      data: { data = {} },
    } = e;
    if (message) toast.error(message);
    for (const key in data) {
      const { message } = data[key];
      if (message) toast.error(`${key}: ${message}`);
    }
  }
}

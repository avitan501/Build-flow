import { handleNotification } from "./handler.ts";
Deno.serve((request: Request) => handleNotification(request, Deno.env));

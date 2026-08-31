// Keep Quo recovery polling in its own Edge isolate while sharing the reviewed
// broker implementation. The route is protected by quo_fast_poll_dispatch_secret.
import "../aura-messaging-broker/index.ts";

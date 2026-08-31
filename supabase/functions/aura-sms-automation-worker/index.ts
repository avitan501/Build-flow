// Keep the SMS automation worker in its own Edge isolate while sharing the
// reviewed broker implementation. The route is protected by the dedicated
// sms_automation_dispatch_secret before any job can be claimed.
import "../aura-messaging-broker/index.ts";

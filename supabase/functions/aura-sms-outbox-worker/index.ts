// Dedicated isolate for durable Aura SMS outbox delivery. The shared broker
// validates the dispatch secret before claiming any customer message.
import "../aura-messaging-broker/index.ts";

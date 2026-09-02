This function drains the service-role-only `aura_message_outbox` ledger.

It is invoked by the database recovery schedule and by the authenticated Aura
broker after enqueue. Provider credentials remain in Supabase Vault or Edge
Function environment variables and are never stored in an outbox payload.

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: any }) {
    // ─────────────────────────────────────────────────────────────
    // Session lookup index
    //
    // Strapi 5's session middleware runs a query on every authenticated
    // request:
    //   SELECT * FROM strapi_sessions WHERE session_id = ? LIMIT 1
    //
    // Without an index this is a full table scan that grows linearly
    // with the number of active sessions. Adding an index makes it an
    // O(log n) lookup regardless of table size.
    //
    // CREATE INDEX IF NOT EXISTS is supported on both SQLite and Postgres,
    // so this is safe to run on every boot.
    // ─────────────────────────────────────────────────────────────
    try {
      await strapi.db.connection.raw(
        'CREATE INDEX IF NOT EXISTS strapi_sessions_session_id_idx ON strapi_sessions (session_id)'
      );
      strapi.log.info('[bootstrap] ensured index strapi_sessions_session_id_idx');
    } catch (err) {
      strapi.log.error('[bootstrap] failed to create session_id index:', err);
    }
  },
};

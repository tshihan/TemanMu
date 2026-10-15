"""Data-access layer (PRD §13 "Backend handshake").

Every function takes an optional `conn`. Pass one to run several calls in one transaction:

    async with get_pool().acquire() as conn, conn.transaction():
        incident = await incidents.create_incident(..., conn=conn)
        await units.update_unit_state(..., conn=conn)

Without `conn`, each call borrows its own pooled connection. Functions return app.models types.
"""


class NotFoundError(LookupError):
    """An update targeted a unit or incident that does not exist."""

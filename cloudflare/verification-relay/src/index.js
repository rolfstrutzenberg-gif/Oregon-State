const MAX_PAYLOAD_BYTES = 32 * 1024;
const MAX_ATTEMPTS = 5;

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

async function secretsEqual(received, expected) {
  if (!received || !expected) {
    return false;
  }

  const encoder = new TextEncoder();
  const [receivedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(received)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const left = new Uint8Array(receivedHash);
  const right = new Uint8Array(expectedHash);
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left[index] ^ right[index];
  }
  return mismatch === 0;
}

async function authorized(request, env) {
  return secretsEqual(
    request.headers.get("x-osrp-verification-secret"),
    env.VERIFICATION_RELAY_SECRET,
  );
}

function validatePayload(payload) {
  const required = [
    "discordUserId",
    "guildId",
    "robloxUserId",
    "robloxUsername",
    "robloxDisplayName",
  ];
  const missing = required.filter((key) => !String(payload?.[key] || "").trim());
  if (missing.length > 0) {
    throw new Error(`Missing verification fields: ${missing.join(", ")}`);
  }
  if (!/^\d{15,25}$/u.test(String(payload.discordUserId))) {
    throw new Error("Invalid Discord user ID.");
  }
  if (!/^\d{15,25}$/u.test(String(payload.guildId))) {
    throw new Error("Invalid guild ID.");
  }
  if (!/^\d+$/u.test(String(payload.robloxUserId))) {
    throw new Error("Invalid Roblox user ID.");
  }
}

async function readPayload(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_PAYLOAD_BYTES) {
    throw new Error("Request body is too large.");
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_PAYLOAD_BYTES) {
    throw new Error("Request body is too large.");
  }
  return JSON.parse(raw);
}

async function enqueue(request, env) {
  const payload = await readPayload(request);
  validatePayload(payload);
  const eventId = crypto.randomUUID();

  await env.DB.prepare(
    `INSERT INTO verification_events
      (id, payload, status, attempts, created_at, updated_at)
     VALUES (?, ?, 'pending', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
  ).bind(eventId, JSON.stringify(payload)).run();

  return json({ ok: true, eventId, status: "pending" }, 202);
}

async function claim(env) {
  const event = await env.DB.prepare(
    `UPDATE verification_events
     SET status = 'processing',
         lease_until = datetime('now', '+60 seconds'),
         attempts = attempts + 1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = (
       SELECT id
       FROM verification_events
       WHERE status = 'pending'
          OR (status = 'processing' AND lease_until < CURRENT_TIMESTAMP)
       ORDER BY created_at ASC
       LIMIT 1
     )
     RETURNING id, payload, attempts`,
  ).first();

  if (!event) {
    return new Response(null, { status: 204 });
  }

  return json({
    ok: true,
    event: {
      id: event.id,
      payload: JSON.parse(event.payload),
      attempts: event.attempts,
    },
  });
}

async function complete(eventId, env) {
  const result = await env.DB.prepare(
    `UPDATE verification_events
     SET status = 'completed',
         lease_until = NULL,
         error = NULL,
         status_code = 200,
         completed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  ).bind(eventId).run();

  return result.meta.changes > 0
    ? json({ ok: true, eventId, status: "completed" })
    : json({ ok: false, error: "Verification event not found." }, 404);
}

async function fail(eventId, request, env) {
  const body = await readPayload(request);
  const statusCode = Number(body.statusCode) || 500;
  const error = String(body.error || "Verification processing failed.").slice(0, 500);
  const retryable = Boolean(body.retryable);

  const result = await env.DB.prepare(
    `UPDATE verification_events
     SET status = CASE
           WHEN ? = 1 AND attempts < ? THEN 'pending'
           ELSE 'failed'
         END,
         lease_until = NULL,
         error = ?,
         status_code = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  ).bind(retryable ? 1 : 0, MAX_ATTEMPTS, error, statusCode, eventId).run();

  return result.meta.changes > 0
    ? json({ ok: true, eventId, retryable })
    : json({ ok: false, error: "Verification event not found." }, 404);
}

async function status(eventId, env) {
  const event = await env.DB.prepare(
    `SELECT id, status, attempts, error, status_code AS statusCode,
            created_at AS createdAt, updated_at AS updatedAt
     FROM verification_events
     WHERE id = ?`,
  ).bind(eventId).first();

  return event
    ? json({ ok: true, event })
    : json({ ok: false, error: "Verification event not found." }, 404);
}

async function handleRequest(request, env) {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/health") {
    const database = await env.DB.prepare("SELECT 1 AS ok").first();
    return json({ ok: database?.ok === 1, service: "osrp-verification-relay" });
  }

  if (!(await authorized(request, env))) {
    return json({ ok: false, error: "Unauthorized." }, 401);
  }

  if (request.method === "POST" && url.pathname === "/verification/callback") {
    return enqueue(request, env);
  }
  if (request.method === "POST" && url.pathname === "/verification/claim") {
    return claim(env);
  }

  const eventMatch = url.pathname.match(/^\/verification\/events\/([a-f0-9-]+)(?:\/(complete|fail))?$/u);
  if (eventMatch && request.method === "GET" && !eventMatch[2]) {
    return status(eventMatch[1], env);
  }
  if (eventMatch && request.method === "POST" && eventMatch[2] === "complete") {
    return complete(eventMatch[1], env);
  }
  if (eventMatch && request.method === "POST" && eventMatch[2] === "fail") {
    return fail(eventMatch[1], request, env);
  }

  return json({ ok: false, error: "Not found." }, 404);
}

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      console.error("Verification relay request failed", error);
      return json({ ok: false, error: error.message || "Invalid request." }, 400);
    }
  },

  async scheduled(_controller, env, context) {
    context.waitUntil(
      env.DB.prepare(
        "DELETE FROM verification_events WHERE created_at < datetime('now', '-7 days')",
      ).run(),
    );
  },
};

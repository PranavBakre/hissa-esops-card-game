// ===========================================
// ESOP Wars v2 - Worker Entry Point
// ===========================================

import { ROOM_CODE_CHARS, ROOM_CODE_LENGTH } from '@esop-wars/shared';

export { GameRoom } from './room';

export interface Env {
  GAME_ROOM: DurableObjectNamespace;
  ALLOWED_ORIGIN: string;
}

function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

function corsHeaders(env: Env): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(data: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(env);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    try {
      // Create room: POST /api/rooms
      if (url.pathname === '/api/rooms' && request.method === 'POST') {
        const code = generateRoomCode();
        const roomId = env.GAME_ROOM.idFromName(code);
        const room = env.GAME_ROOM.get(roomId);

        // Initialize the room
        await room.fetch(
          new Request(`${url.origin}/init`, {
            method: 'POST',
            body: JSON.stringify({ code }),
          })
        );

        return json({ code }, cors);
      }

      // Get room info: GET /api/rooms/:code
      const roomInfoMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{4})$/);
      if (roomInfoMatch && request.method === 'GET') {
        const code = roomInfoMatch[1];
        const roomId = env.GAME_ROOM.idFromName(code);
        const room = env.GAME_ROOM.get(roomId);

        const response = await room.fetch(
          new Request(`${url.origin}/info`, { method: 'GET' })
        );
        const data = await response.json();

        return json(data, cors);
      }

      // WebSocket: GET /api/rooms/:code/ws
      const wsMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{4})\/ws$/);
      if (wsMatch) {
        const code = wsMatch[1];
        const roomId = env.GAME_ROOM.idFromName(code);
        const room = env.GAME_ROOM.get(roomId);

        // Forward the WebSocket upgrade request to the Durable Object
        return room.fetch(request);
      }

      // Health check
      if (url.pathname === '/health') {
        return json({ status: 'ok', timestamp: Date.now() }, cors);
      }

      return new Response('Not found', { status: 404, headers: cors });
    } catch (error) {
      console.error('Worker error:', error);
      return json(
        { error: 'Internal server error' },
        { ...cors, status: '500' }
      );
    }
  },
};

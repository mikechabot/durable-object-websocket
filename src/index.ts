import { DurableObject } from 'cloudflare:workers';

import { corsHeaders } from './constants';

export class TestDurableObject extends DurableObject<Env> {
	sessions: Map<WebSocket, { [key: string]: string }>;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);

		// Wake up any hibernating WebSockets place them back in the sessions map.
		this.sessions = new Map();
		this.ctx.getWebSockets().forEach((ws) => {
			const attachment = ws.deserializeAttachment();
			if (attachment) {
				this.sessions.set(ws, { ...attachment });
			}
		});

		// Sets an application level auto response that does not wake hibernated WebSockets.
		this.ctx.setWebSocketAutoResponse(
			new WebSocketRequestResponsePair('ping', 'pong'),
		);
	}

	/**
	 * WebSockets cannot be serialized over RPC, so we need to use
	 * "fetch" for now.
	 * https://github.com/cloudflare/workerd/issues/2319
	 * @param request
	 */
	async fetch(request: Request): Promise<Response> {
		const webSocketPair = new WebSocketPair();
		const [client, server] = Object.values(webSocketPair);

		this.ctx.acceptWebSocket(server);

		const id = crypto.randomUUID();
		server.serializeAttachment({ id });
		this.sessions.set(server, { id });

		return new Response(null, { status: 101, webSocket: client });
	}

	async webSocketClose(ws: WebSocket, code: number) {
		ws.close(code, 'Durable Object is closing WebSocket');
	}

	async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
		// Get the session associated with the WebSocket connection.
		const session = this.sessions.get(ws)!;

		// Upon receiving a message from the client, the server replies with the same message, the session ID of the connection,
		// and the total number of connections with the "[Durable Object]: " prefix
		ws.send(
			`[Durable Object] message: ${message}, from: ${session.id}. Total connections: ${this.sessions.size}`,
		);

		// Send a message to all WebSocket connections, loop over all the connected WebSockets.
		this.sessions.forEach((attachment, connectedWs) => {
			connectedWs.send(
				`[Durable Object] message: ${message}, from: ${session.id}. Total connections: ${this.sessions.size}`,
			);
		});

		// Send a message to all WebSocket connections except the connection (ws),
		// loop over all the connected WebSockets and filter out the connection (ws).
		this.sessions.forEach((attachment, connectedWs) => {
			if (connectedWs !== ws) {
				connectedWs.send(
					`[Durable Object] message: ${message}, from: ${session.id}. Total connections: ${this.sessions.size}`,
				);
			}
		});
	}

	async handlePushUpdate(data: any) {
		const message = JSON.stringify({
			data,
			type: 'update',
		});
		this.sessions.forEach((k, session) => {
			console.log(`Pushing update to id "${k}`);
			session.send(message);
		});
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const method = request.method;
		const url = new URL(request.url);
		const pathname = url.pathname;
		const origin = request.headers.get('Origin');
		const headers = corsHeaders(origin);

		if (method === 'OPTIONS') {
			return new Response(null, { headers });
		}

		const room = `path:${pathname}`;
		console.log(`Using ${room}`);

		const id = env.TEST_DURABLE_OBJECT.idFromName(room);
		const stub = env.TEST_DURABLE_OBJECT.get(id);

		const upgradeHeader = request.headers.get('Upgrade');
		if (upgradeHeader !== 'websocket') {
			return new Response('Expected Upgrade: websocket', { status: 426 });
		}

		return stub.fetch(request);
	},
} satisfies ExportedHandler<Env>;

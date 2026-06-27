import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { Server, Socket } from "socket.io";
import { env } from "../../core/config/env";
import { JwtPayload } from "../../core/types/express";
import { adminScopeService } from "../../shared/scope/admin-scope.service";
import { nationalRoom, resolveBroadcastRooms, SOCKET_EVENTS, unitRoom } from "./socket.rooms";

let io: Server | null = null;

export function getSocketServer(): Server {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN, methods: ["GET", "POST"] },
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  io.use((socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ??
        socket.handshake.headers.authorization?.replace("Bearer ", "");
      if (!token) return next(new Error("Authentication required"));
      socket.data.user = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => void onConnect(socket));
  return io;
}

async function onConnect(socket: Socket): Promise<void> {
  const user = socket.data.user as JwtPayload;

  if (user.role === "PMO" || user.role === "MINISTER") {
    await socket.join(nationalRoom());
  }

  if (user.adminUnitId) {
    const chain = await adminScopeService.getAncestorChain(user.adminUnitId);
    for (const node of chain) {
      await socket.join(unitRoom(node.type, node.id));
    }
  }

  socket.emit(SOCKET_EVENTS.CONNECTED, {
    userId: user.sub,
    role: user.role,
    adminUnitId: user.adminUnitId,
  });
}

export async function broadcastToHierarchy(
  adminUnitId: string,
  event: string,
  payload: unknown,
): Promise<void> {
  const rooms = await resolveBroadcastRooms(adminUnitId, (id) =>
    adminScopeService.getAncestorChain(id),
  );
  const server = getSocketServer();
  for (const room of rooms) {
    server.to(room).emit(event, payload);
  }
}

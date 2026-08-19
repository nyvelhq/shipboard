import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/jwt-payload.type';

// Rooms are named "list:<listId>" — one room per List. A client joins after
// the server verifies workspace membership, same check as every REST route.
@WebSocketGateway({ cors: { origin: '*' } })
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const payload = this.jwt.verify<JwtPayload>(token);
      client.data.userId = payload.sub;
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage('list:join')
  async joinList(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { workspaceId: string; listId: string },
  ) {
    const userId = client.data.userId as string | undefined;
    if (!userId) return;

    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: data.workspaceId, userId } },
    });
    if (!membership) return; // not a member — join silently ignored, no events leak

    client.join(`list:${data.listId}`);
  }

  @SubscribeMessage('list:leave')
  leaveList(@ConnectedSocket() client: Socket, @MessageBody() data: { listId: string }) {
    client.leave(`list:${data.listId}`);
  }

  emitListChanged(listId: string) {
    this.server.to(`list:${listId}`).emit('list:changed', { listId });
  }
}

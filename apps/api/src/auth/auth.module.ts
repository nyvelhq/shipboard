import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

if (!process.env.JWT_SECRET) {
  throw new Error('Missing JWT_SECRET in .env — see apps/api/.env.example.');
}

// @Global so JwtAuthGuard/JwtService are available to every feature module's
// @UseGuards() without each one importing AuthModule individually.
@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '12h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard],
})
export class AuthModule {}

import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ConfigModule } from '@nestjs/config';
import { ApiModule } from '@api/ApiModule.module';
import { InfrastructureModule } from '@infra/InfrastructureModule.module';
import { HttpExceptionFilter } from '@api/common/filters/HttpExceptionFilter.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV === 'development'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        autoLogging: false,
      },
    }),
    InfrastructureModule,
    ApiModule,
  ],
  providers: [HttpExceptionFilter],
})
export class AppModule {}

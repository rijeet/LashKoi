import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './AppModule.module';
import { HttpExceptionFilter } from '@api/common/filters/HttpExceptionFilter.filter';
import { ResponseInterceptor } from '@api/common/interceptors/ResponseInterceptor.interceptor';
import type { INestApplication } from '@nestjs/common';
import { ApiConfigService } from '@infra/config/layer-configs/ApiConfig.service';
import { LoginRequestDto } from '@shared/dtos/auth/LoginRequestDto';
import {
  AuthLoginResponseDto,
  AuthUserDto,
  TokenRefreshResponseDto,
} from '@shared/dtos/auth/AuthLoginResponseDto';
import {
  CreateIncidentRequestDto,
  IncidentLocationDto,
  IncidentMediaDto,
  PatchIncidentRequestDto,
} from '@shared/dtos/incidents/CreateIncidentRequestDto';
import { ErrorResponseDto, ErrorBodyDto } from '@shared/dtos/common/ErrorResponseDto';
import { SuccessResponseDto } from '@shared/dtos/common/SuccessResponseDto';

export async function createNestApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const apiConfig = app.get(ApiConfigService);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.enableCors({
    origin: apiConfig.corsOrigins,
    credentials: false,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Partner-Key'],
  });

  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'swagger', 'swagger-json', 'sitemap.xml', 'robots.txt'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(app.get(HttpExceptionFilter));
  app.useGlobalInterceptors(app.get(ResponseInterceptor));

  if (apiConfig.swaggerEnabled) {
    const swaggerCfg = new DocumentBuilder()
      .setTitle('LashKoi API')
      .setDescription(
        `Bangladesh incident map — public read APIs + admin auth/incidents.

**Auth (D1):** refresh token in \`Authorization: Bearer\` on \`POST /admin/auth/refresh\`; access token on admin routes.

**Envelope:** success responses are \`{ status, message, statusCode, data }\`.`,
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          in: 'header',
        },
        'JWT-auth',
      )
      .build();
    const doc = SwaggerModule.createDocument(app, swaggerCfg, {
      extraModels: [
        LoginRequestDto,
        AuthLoginResponseDto,
        AuthUserDto,
        TokenRefreshResponseDto,
        CreateIncidentRequestDto,
        PatchIncidentRequestDto,
        IncidentLocationDto,
        IncidentMediaDto,
        SuccessResponseDto,
        ErrorResponseDto,
        ErrorBodyDto,
      ],
    });
    SwaggerModule.setup('swagger', app, doc, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'list',
        defaultModelsExpandDepth: 2,
        tryItOutEnabled: true,
        displayRequestDuration: true,
      },
      customSiteTitle: 'LashKoi API',
    });
  }

  await app.init();
  return app;
}

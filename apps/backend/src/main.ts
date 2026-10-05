import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './presentation/http/app.module';
import { ApiExceptionFilter } from './presentation/http/api-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
  app.enableCors({ origin: frontendOrigin, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] });
  app.useGlobalFilters(new ApiExceptionFilter());
  const port = Number(process.env.BACKEND_PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
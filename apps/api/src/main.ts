import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // Native apps never send an Origin header; only the Flutter web build runs in a browser.
  // Development: any origin. Production: only the origins listed in CORS_ORIGINS (none = CORS off).
  const corsOrigins = config.get<string[]>('corsOrigins')!;
  if (corsOrigins.length > 0) {
    app.enableCors({ origin: corsOrigins });
  } else if (config.get<string>('nodeEnv') !== 'production') {
    app.enableCors();
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle('THY Business API')
    .setDescription('API du MVP commerçant solo de THY Business')
    .setVersion('0.1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('port')!;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`THY Business API listening on http://localhost:${port} (docs: /api/docs)`);
}

bootstrap();

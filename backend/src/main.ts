import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('HMIS-Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // allow Swagger UI assets
    }),
  );
  app.use(cookieParser());

  // Enable CORS
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization,X-Requested-With',
  });

  // Global API Prefix
  app.setGlobalPrefix('api/v1');

  // Global Filters & Interceptors
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Global DTO Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('HMIS - Hospital Management & Integrated Healthcare API')
    .setDescription(
      'Enterprise-grade REST API documentation for HMIS. Includes full specifications for Auth, Patients, Doctors, Appointments, Consultations, EMR, Prescriptions, Laboratory, Pharmacy, Billing, Admissions, and Reports.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication and session tokens')
    .addTag('users', 'System users and role assignment')
    .addTag('patients', 'Patient registration, 360 profiles, and medical timeline')
    .addTag('doctors', 'Doctor directories and weekly schedules')
    .addTag('departments', 'Clinical department directories')
    .addTag('appointments', 'Appointment booking and lifecycle state transitions')
    .addTag('consultations', 'Doctor clinical evaluations, vitals, and diagnoses')
    .addTag('medical-records', 'Aggregated electronic medical records (EMR)')
    .addTag('prescriptions', 'Prescription generation and pharmacy dispensing')
    .addTag('laboratory', 'Laboratory diagnostic orders, specimen tracking, and results')
    .addTag('pharmacy', 'Medicine catalog, FEFO dispensing, and inventory stock tracking')
    .addTag('billing', 'Invoicing, line items, and payment processing')
    .addTag('admissions', 'Inpatient admission, ward bed allocation, and discharge summaries')
    .addTag('notifications', 'In-app user notifications')
    .addTag('reports', 'Hospital operational analytics, bed occupancy, and revenue KPIs')
    .addTag('audit-logs', 'Security and compliance audit trail')
    .addTag('documents', 'Electronic document attachment metadata')
    .addTag('search', 'Global multi-resource authorized search')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'HMIS API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`🏥 HMIS Backend API server successfully started on http://localhost:${port}/api/v1`);
  logger.log(`📚 Swagger documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();

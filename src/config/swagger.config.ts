import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle(process.env.SWAGGER_TITLE || 'Hierarchical Structures API')
    .setDescription(
      process.env.SWAGGER_DESCRIPTION ||
        'API for managing hierarchical structures and permissions',
    )
    .setVersion(process.env.SWAGGER_VERSION || '1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Structures', 'Hierarchical structure management')
    .addTag('Users', 'User management')
    .addServer(
      process.env.NODE_ENV === 'production'
        ? 'https://api.yourserver.com' // TODO: Change to actual server
        : 'http://localhost:3000',
      process.env.NODE_ENV === 'production' ? 'Production' : 'Development',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(process.env.SWAGGER_PATH || 'api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 30px 0 }
      .swagger-ui .scheme-container { margin: 30px 0 }
      .swagger-ui .info .title { font-size: 2.5em }
      .swagger-ui .info .description { font-size: 1.1em }
      .swagger-ui .auth-wrapper .authorize { margin-right: 10px }
      .swagger-ui .opblock .opblock-summary-description { text-align: right }
    `,
    customJs: '/custom.js',
  });
}

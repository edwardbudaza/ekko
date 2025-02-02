# CI/CD and Deployment Strategies in NestJS

## Introduction

In this eighth part of our series, we'll implement continuous integration and continuous deployment (CI/CD) pipelines and explore various deployment strategies for our hierarchical structures API. We'll use GitHub Actions for CI/CD and cover deployment to different cloud platforms.

## GitHub Actions CI Pipeline

### Main Workflow

```yaml
# .github/workflows/main.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres123
          POSTGRES_DB: ekko_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:6
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run tests
        run: npm run test
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USERNAME: postgres
          DB_PASSWORD: postgres123
          DB_DATABASE: ekko_test
          REDIS_HOST: localhost
          REDIS_PORT: 6379

      - name: Run e2e tests
        run: npm run test:e2e
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USERNAME: postgres
          DB_PASSWORD: postgres123
          DB_DATABASE: ekko_test
          REDIS_HOST: localhost
          REDIS_PORT: 6379

  build:
    needs: test
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v1

      - name: Login to DockerHub
        uses: docker/login-action@v1
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v2
        with:
          push: true
          tags: yourusername/ekko-api:latest,yourusername/ekko-api:${{ github.sha }}
          cache-from: type=registry,ref=yourusername/ekko-api:latest
          cache-to: type=inline
```

## Deployment Configurations

### Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ekko-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ekko-api
  template:
    metadata:
      labels:
        app: ekko-api
    spec:
      containers:
        - name: api
          image: yourusername/ekko-api:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: 'production'
            - name: DB_HOST
              valueFrom:
                secretKeyRef:
                  name: ekko-secrets
                  key: db-host
          resources:
            limits:
              cpu: '1'
              memory: '1Gi'
            requests:
              cpu: '500m'
              memory: '512Mi'
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
```

### Helm Chart

```yaml
# helm/ekko/values.yaml
replicaCount: 3

image:
  repository: yourusername/ekko-api
  tag: latest
  pullPolicy: Always

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: true
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: api.ekko.com
      paths:
        - path: /
          pathType: Prefix

resources:
  limits:
    cpu: 1
    memory: 1Gi
  requests:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
```

## Deployment Strategies

### Blue-Green Deployment

```typescript
// scripts/blue-green-deploy.ts
async function blueGreenDeploy() {
  const k8s = new K8sClient();

  // Get current active deployment
  const activeDeployment = await k8s.getCurrentActiveDeployment();
  const newColor = activeDeployment.color === 'blue' ? 'green' : 'blue';

  // Deploy new version
  await k8s.createDeployment({
    name: `ekko-api-${newColor}`,
    image: 'yourusername/ekko-api:latest',
    replicas: 3,
  });

  // Wait for new deployment to be ready
  await k8s.waitForDeploymentReady(`ekko-api-${newColor}`);

  // Switch traffic to new deployment
  await k8s.updateService('ekko-api', {
    selector: {
      app: `ekko-api-${newColor}`,
    },
  });

  // Wait for health checks
  await sleep(30000);

  // Delete old deployment
  await k8s.deleteDeployment(`ekko-api-${activeDeployment.color}`);
}
```

### Canary Deployment

```typescript
// scripts/canary-deploy.ts
async function canaryDeploy() {
  const k8s = new K8sClient();

  // Deploy canary version with 10% traffic
  await k8s.createDeployment({
    name: 'ekko-api-canary',
    image: 'yourusername/ekko-api:latest',
    replicas: 1,
  });

  await k8s.updateService('ekko-api', {
    trafficPolicy: {
      'ekko-api-stable': 90,
      'ekko-api-canary': 10,
    },
  });

  // Monitor metrics for 10 minutes
  const metrics = await monitorCanaryMetrics(600);

  if (metrics.isHealthy) {
    // Gradually increase traffic to canary
    for (let i = 20; i <= 100; i += 20) {
      await k8s.updateService('ekko-api', {
        trafficPolicy: {
          'ekko-api-stable': 100 - i,
          'ekko-api-canary': i,
        },
      });
      await sleep(300000); // Wait 5 minutes between increases
    }

    // Promote canary to stable
    await k8s.promoteCanary();
  } else {
    // Rollback
    await k8s.rollbackCanary();
  }
}
```

## Monitoring Deployments

### Deployment Health Check

```typescript
@Injectable()
export class DeploymentHealthService {
  constructor(
    private readonly metricsService: PrometheusService,
    private readonly logger: CustomLogger,
  ) {}

  async checkDeploymentHealth(): Promise<boolean> {
    const metrics = await this.metricsService.getMetrics();

    // Check error rate
    const errorRate =
      metrics.http_requests_total.filter((r) => r.status >= 500).length /
      metrics.http_requests_total.length;

    if (errorRate > 0.01) {
      // More than 1% error rate
      this.logger.error(`High error rate detected: ${errorRate * 100}%`);
      return false;
    }

    // Check response time
    const p95ResponseTime = metrics.http_request_duration_seconds.p95;
    if (p95ResponseTime > 1.0) {
      // P95 > 1 second
      this.logger.error(
        `Slow response times detected: P95 = ${p95ResponseTime}s`,
      );
      return false;
    }

    return true;
  }
}
```

## Automated Rollback

```typescript
@Injectable()
export class DeploymentService {
  constructor(
    private readonly k8sClient: K8sClient,
    private readonly healthService: DeploymentHealthService,
    private readonly logger: CustomLogger,
  ) {}

  async monitorDeployment(deploymentName: string): Promise<void> {
    let healthyChecks = 0;
    let unhealthyChecks = 0;

    while (true) {
      const isHealthy = await this.healthService.checkDeploymentHealth();

      if (isHealthy) {
        healthyChecks++;
        unhealthyChecks = 0;
      } else {
        unhealthyChecks++;
      }

      if (healthyChecks >= 5) {
        this.logger.log('Deployment confirmed healthy');
        break;
      }

      if (unhealthyChecks >= 3) {
        this.logger.error(
          'Deployment health check failed, initiating rollback',
        );
        await this.rollback(deploymentName);
        break;
      }

      await sleep(60000); // Check every minute
    }
  }

  private async rollback(deploymentName: string): Promise<void> {
    try {
      await this.k8sClient.rollback(deploymentName);
      this.logger.log('Rollback completed successfully');
    } catch (error) {
      this.logger.error('Rollback failed', error.stack);
      // Notify operations team
      await this.notifyOperations('Deployment rollback failed');
    }
  }
}
```

## What's Next?

In Part 9, we'll explore implementing security best practices and hardening our application for production use.

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)

## Conclusion

This article covered the implementation of CI/CD pipelines and deployment strategies for our NestJS application. We explored various deployment methods and monitoring techniques to ensure reliable and efficient deployments. In the next article, we'll focus on implementing security best practices and hardening our application.

const request = require('supertest');
const app = require('../src/server');

describe('Authentication Routes', () => {
  describe('GET /auth/status', () => {
    it('should return authentication status', async () => {
      const response = await request(app)
        .get('/auth/status')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('authenticated');
      expect(typeof response.body.authenticated).toBe('boolean');
    });
  });

  describe('GET /auth/login', () => {
    it('should redirect to Auth0 login', async () => {
      const response = await request(app)
        .get('/auth/login')
        .expect(302);

      expect(response.headers.location).toContain('auth0.com');
    });

    it('should handle productId parameter', async () => {
      const response = await request(app)
        .get('/auth/login?productId=product1')
        .expect(302);

      expect(response.headers.location).toContain('auth0.com');
    });
  });

  describe('GET /auth/logout', () => {
    it('should redirect to Auth0 logout', async () => {
      const response = await request(app)
        .get('/auth/logout')
        .expect(302);

      expect(response.headers.location).toContain('auth0.com');
    });
  });
});

describe('Health Check', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });
});

describe('API Routes', () => {
  describe('GET /api/health', () => {
    it('should return API health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('status', 'healthy');
    });
  });

  describe('POST /api/validate-token', () => {
    it('should require token in request body', async () => {
      const response = await request(app)
        .post('/api/validate-token')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Token is required');
    });

    it('should reject invalid token format', async () => {
      const response = await request(app)
        .post('/api/validate-token')
        .send({ token: 'invalid-token' })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});

describe('Error Handling', () => {
  describe('GET /nonexistent', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not Found');
      expect(response.body).toHaveProperty('path', '/nonexistent');
    });
  });
});

describe('CORS', () => {
  it('should include CORS headers', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.headers).toHaveProperty('access-control-allow-origin');
  });
});

describe('Security Headers', () => {
  it('should include security headers', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
    expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
  });
});

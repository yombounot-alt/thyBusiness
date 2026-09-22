import { ValidationPipe, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  const phone = '+224611111111';
  const password = 'MotDePasse123!';

  async function getLatestOtpCode(forPhone: string): Promise<string> {
    const otp = await prisma.otpVerification.findFirst({
      where: { phone: forPhone },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) throw new Error(`No OTP found for ${forPhone}`);
    return otp.code;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    prisma = new PrismaClient();

    // Clean slate for this test's own fixtures only — this suite never creates a business, so
    // scope cleanup to this phone number rather than wiping shared tables other suites also use.
    const existingUser = await prisma.user.findUnique({ where: { phone } });
    if (existingUser) {
      await prisma.refreshToken.deleteMany({ where: { userId: existingUser.id } });
    }
    await prisma.otpVerification.deleteMany({ where: { phone } });
    await prisma.user.deleteMany({ where: { phone } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('rejects a malformed phone number on signup', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ phone: 'not-a-phone', password, fullName: 'Test User' })
      .expect(400);
  });

  it('rejects login before signup', async () => {
    await request(app.getHttpServer()).post('/auth/login').send({ phone, password }).expect(401);
  });

  it('runs the full signup -> otp verify -> me flow', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ phone, password, fullName: 'Test User' })
      .expect(201);

    const wrongCodeRes = await request(app.getHttpServer())
      .post('/auth/otp/verify')
      .send({ phone, purpose: 'signup', code: '000000' })
      .expect(400);
    expect(wrongCodeRes.body.message).toBeDefined();

    const code = await getLatestOtpCode(phone);

    const verifyRes = await request(app.getHttpServer())
      .post('/auth/otp/verify')
      .send({ phone, purpose: 'signup', code })
      .expect(201);

    expect(verifyRes.body.accessToken).toBeDefined();
    expect(verifyRes.body.refreshToken).toBeDefined();

    const meRes = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${verifyRes.body.accessToken}`)
      .expect(200);

    expect(meRes.body.phone).toBe(phone);
    expect(meRes.body.phoneVerified).toBe(true);
    expect(meRes.body.activeBusinessId).toBeNull();
    expect(meRes.body.businesses).toEqual([]);
  });

  it('rejects /auth/me without a token', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('logs in with the right password and rejects the wrong one', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone, password: 'WrongPassword1!' })
      .expect(401);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone, password })
      .expect(201);

    expect(loginRes.body.accessToken).toBeDefined();
    expect(loginRes.body.refreshToken).toBeDefined();
  });

  it('rotates tokens on refresh and rejects reuse of the old refresh token', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone, password })
      .expect(201);

    const firstRefreshToken = loginRes.body.refreshToken;

    const refreshRes = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: firstRefreshToken })
      .expect(201);

    expect(refreshRes.body.accessToken).toBeDefined();
    expect(refreshRes.body.refreshToken).not.toBe(firstRefreshToken);

    // Reusing the now-revoked refresh token must fail.
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: firstRefreshToken })
      .expect(401);
  });

  it('revokes the refresh token on logout', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone, password })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken: loginRes.body.refreshToken })
      .expect(204);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: loginRes.body.refreshToken })
      .expect(401);
  });
});

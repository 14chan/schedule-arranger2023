'use strict';
const request = require('supertest');
const app = require('../app');
const passportStub = require('passport-stub');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({log: ['query']});
 
describe('/login', () => {
  beforeAll(() => {
    passportStub.install(app);
    passportStub.login({username: 'testuser'});
  });

  afterAll(() => {
    passportStub.logout();
    passportStub.uninstall();
  });
  test('ログインのためのリンクが含まれる', async() => {
    await request(app)
      .get('/login')
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(/<a href="\/auth\/github"/)
      .expect(200);
  });

  test('ログイン時にユーザ名が表示される', async() => {
    await request(app)
      .get('/login')
      .expect(/testuser/)
      .expect(200);
  });
});

describe('/logout', () => {
  test('/へリダイレクトされる', async() => {
    await request(app)
      .get('/logout')
      .expect('Location', '/')
      .expect(302);
  })
});

describe('/schedules', () => {
  let scheduleId = '';
  beforeAll(() => {
    passportStub.install(app);
    passportStub.login({id: 0, username: 'testuser'});
  });
  afterAll(async() => {
    passportStub.logout();
    passportStub.uninstall();

    // テストで作成したデータを削除
    await prisma.candidate.deleteMany({ where:{scheduleId} });
    await prisma.schedule.delete({ where: { scheduleId } });
  });

  test('予定が作成でき、表示できる', async() => {
    const userId = 0, username = 'testuser';
    const data = { userId, username };
    await prisma.user.upsert({
      where: {userId},
      create: data,
      update: data
    });
    const res = await request(app)
      .post('/schedules')
      .send({
        scheduleName: 'テスト予定1',
        memo: 'テストメモ1\r\nテストメモ2',
        candidates: 'テスト候補1\r\nテスト候補2\r\nテスト候補3'
      })
      .expect('Location', /schedules/)
      .expect(302);

      const createdSchedulePath = res.headers.location;
      scheduleId = createdSchedulePath.split('/schedules/')[1];
      await request(app)
        .get(createdSchedulePath)
        // TODO 作成された予定と候補が表示されていることをテストする
        .expect('Content-Type', 'text/html; charset=utf-8')
        .expect(/テスト予定1/)
        .expect(/テストメモ1/)
        .expect(/テストメモ2/)
        .expect(/テスト候補1/)
        .expect(/テスト候補2/)
        .expect(/テスト候補3/)
        .expect(200);
  });
})

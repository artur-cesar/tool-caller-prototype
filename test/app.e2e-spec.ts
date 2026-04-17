import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from './../src/app.module';

function expectAskResponse(body: unknown, content: string) {
  expect(body).not.toBeNull();
  expect(typeof body).toBe('object');

  const responseBody = body as {
    conversationId?: unknown;
    type?: unknown;
    content?: unknown;
  };

  expect(typeof responseBody.conversationId).toBe('string');
  expect(responseBody.type).toBe('final_answer');
  expect(responseBody.content).toBe(content);
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/ask (POST)', () => {
    return request(app.getHttpServer())
      .post('/ask')
      .set('x-user-id', 'user-1')
      .send({ message: 'Qual o status do pedido 123?' })
      .expect(201)
      .expect((response) => {
        expectAskResponse(
          response.body as unknown,
          'O pedido 123 foi pago e está em processamento.',
        );
      });
  });

  it('/ask (POST) should return final answer for an unknown order id', () => {
    return request(app.getHttpServer())
      .post('/ask')
      .set('x-user-id', 'user-1')
      .send({ message: 'Quero o status do pedido 999' })
      .expect(201)
      .expect((response) => {
        expectAskResponse(
          response.body as unknown,
          'Não encontrei o pedido 999.',
        );
      });
  });

  it('/ask (POST) should return final answer when it cannot infer a valid order lookup', () => {
    return request(app.getHttpServer())
      .post('/ask')
      .set('x-user-id', 'user-1')
      .send({ message: 'Me ajuda com uma duvida geral?' })
      .expect(201)
      .expect((response) => {
        expectAskResponse(
          response.body as unknown,
          'Não identifiquei uma consulta de pedido com código válido. Tente algo como: "Qual o status do pedido 123?"',
        );
      });
  });

  it('/ask (POST) should require x-user-id', () => {
    return request(app.getHttpServer())
      .post('/ask')
      .send({ message: 'Qual o status do pedido 123?' })
      .expect(400);
  });

  it('/ask (POST) should validate payload', () => {
    return request(app.getHttpServer())
      .post('/ask')
      .set('x-user-id', 'user-1')
      .send({ message: 'oi' })
      .expect(400);
  });

  afterEach(async () => {
    await app.close();
  });
});

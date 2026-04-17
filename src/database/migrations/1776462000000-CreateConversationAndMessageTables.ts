import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateConversationAndMessageTables1776462000000 implements MigrationInterface {
  name = 'CreateConversationAndMessageTables1776462000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`
      CREATE TYPE "public"."message_role_enum" AS ENUM('user', 'assistant', 'tool')
    `);
    await queryRunner.query(`
      CREATE TABLE "conversations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" character varying NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_9c6f83d6b1f9f8085353036d4c3" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "conversationId" uuid NOT NULL,
        "role" "public"."message_role_enum" NOT NULL,
        "content" text NOT NULL,
        "toolName" character varying,
        "toolUseId" character varying,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "messages"
      ADD CONSTRAINT "FK_7f4d7f6b0a4c0a8b0d4c6d4c0d0"
      FOREIGN KEY ("conversationId") REFERENCES "conversations"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "messages"
      DROP CONSTRAINT "FK_7f4d7f6b0a4c0a8b0d4c6d4c0d0"
    `);
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(`DROP TABLE "conversations"`);
    await queryRunner.query(`DROP TYPE "public"."message_role_enum"`);
  }
}

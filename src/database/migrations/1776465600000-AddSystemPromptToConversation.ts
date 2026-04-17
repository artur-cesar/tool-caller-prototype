import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSystemPromptToConversation1776465600000 implements MigrationInterface {
  name = 'AddSystemPromptToConversation1776465600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "conversations"
      ADD "systemPrompt" text NOT NULL DEFAULT 'You are an assistant for order support experiments.
You can answer directly or call a tool when backend data is required.
Rules:
- Never invent or guess order information.
- Never hallucinate order status.
- If the user asks about an order and an order ID is available, call the appropriate tool.
- If the user asks about an order but the required information is missing, ask for clarification.
- After receiving a tool result, answer using only the tool output.
- Keep answers concise, clear, and factual.'
    `);
    await queryRunner.query(`
      ALTER TABLE "conversations"
      ALTER COLUMN "systemPrompt" DROP DEFAULT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "conversations"
      DROP COLUMN "systemPrompt"
    `);
  }
}

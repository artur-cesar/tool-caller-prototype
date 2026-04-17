import { join } from 'node:path';

import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';

type ConfigValueReader = Pick<ConfigService, 'getOrThrow'>;

type EnvValueReader = Record<string, string | undefined>;

const ENTITIES_GLOB = join(__dirname, '..', '**', '*.entity.{ts,js}');
const MIGRATIONS_GLOB = join(__dirname, 'migrations', '*.{ts,js}');

function parsePort(rawPort: string) {
  const port = Number.parseInt(rawPort, 10);

  if (Number.isNaN(port)) {
    throw new Error(`Invalid DB_PORT value: ${rawPort}`);
  }

  return port;
}

function getDataSourceBaseOptions(
  config: ConfigValueReader,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: config.getOrThrow<string>('DB_HOST'),
    port: parsePort(config.getOrThrow<string>('DB_PORT')),
    username: config.getOrThrow<string>('DB_USERNAME'),
    password: config.getOrThrow<string>('DB_PASSWORD'),
    database: config.getOrThrow<string>('DB_DATABASE'),
    synchronize: false,
    logging: false,
    entities: [ENTITIES_GLOB],
    migrations: [MIGRATIONS_GLOB],
    migrationsTableName: 'typeorm_migrations',
  };
}

export function getTypeOrmModuleOptions(
  configService: ConfigService,
): TypeOrmModuleOptions {
  return {
    ...getDataSourceBaseOptions(configService),
    autoLoadEntities: false,
  };
}

export function getDataSourceOptionsFromEnv(
  env: EnvValueReader,
): DataSourceOptions {
  return getDataSourceBaseOptions({
    getOrThrow(key: string): string {
      const value = env[key];

      if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
      }

      return value;
    },
  });
}

export function isDatabaseEnabled(env: EnvValueReader) {
  if (env.DATABASE_ENABLED === 'false') {
    return false;
  }

  return env.NODE_ENV !== 'test';
}

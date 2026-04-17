import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { getTypeOrmModuleOptions, isDatabaseEnabled } from './typeorm.config';

@Module({})
export class DatabaseModule {
  static register(): DynamicModule {
    if (!isDatabaseEnabled(process.env)) {
      return {
        module: DatabaseModule,
      };
    }

    return {
      module: DatabaseModule,
      imports: [
        ConfigModule,
        TypeOrmModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (configService: ConfigService) =>
            getTypeOrmModuleOptions(configService),
        }),
      ],
    };
  }
}

import 'reflect-metadata';

import { DataSource } from 'typeorm';

import { getDataSourceOptionsFromEnv } from './typeorm.config';

const appDataSource = new DataSource(getDataSourceOptionsFromEnv(process.env));

export default appDataSource;

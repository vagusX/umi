import { MFSU, MF_DEP_PREFIX } from '@umijs/mfsu';
import webpack from '../compiled/webpack';
import { getConfig } from './config/config';
import { MFSU_NAME } from './constants';
import { createServer } from './server/server';
import { Env, IConfig } from './types';

interface IOpts {
  afterMiddlewares?: any[];
  beforeMiddlewares?: any[];
  onDevCompileDone?: Function;
  port?: number;
  host?: string;
  chainWebpack?: Function;
  modifyWebpackConfig?: Function;
  beforeBabelPlugins?: any[];
  beforeBabelPresets?: any[];
  extraBabelPlugins?: any[];
  extraBabelPresets?: any[];
  cwd: string;
  config: IConfig;
  entry: Record<string, string>;
}

export async function dev(opts: IOpts) {
  const enableMFSU = opts.config.mfsu !== false;
  let mfsu: MFSU | null = null;
  if (enableMFSU) {
    mfsu = new MFSU({
      implementor: webpack as any,
      buildDepWithESBuild: opts.config.mfsu?.esbuild,
    });
  }
  const webpackConfig = await getConfig({
    cwd: opts.cwd,
    env: Env.development,
    entry: opts.entry,
    userConfig: opts.config,
    extraBabelPlugins: [
      ...(opts.beforeBabelPlugins || []),
      ...(mfsu?.getBabelPlugins() || []),
      ...(opts.extraBabelPlugins || []),
    ],
    extraBabelPresets: [
      ...(opts.beforeBabelPresets || []),
      ...(opts.extraBabelPresets || []),
    ],
    chainWebpack: opts.chainWebpack,
    modifyWebpackConfig: opts.modifyWebpackConfig,
    hmr: true,
    analyze: process.env.ANALYZE,
  });
  const depConfig = await getConfig({
    cwd: opts.cwd,
    env: Env.development,
    entry: opts.entry,
    userConfig: opts.config,
    hash: true,
    staticPathPrefix: MF_DEP_PREFIX,
    name: MFSU_NAME,
  });
  webpackConfig.resolve!.alias ||= {};
  // TODO: REMOVE ME
  ['@umijs/utils/compiled/strip-ansi', 'react-error-overlay'].forEach((dep) => {
    // @ts-ignore
    webpackConfig.resolve!.alias[dep] = require.resolve(dep);
  });
  mfsu?.setWebpackConfig({
    config: webpackConfig as any,
    depConfig: depConfig as any,
  });
  await createServer({
    webpackConfig,
    userConfig: opts.config,
    cwd: opts.cwd,
    beforeMiddlewares: [
      ...(mfsu?.getMiddlewares() || []),
      ...(opts.beforeMiddlewares || []),
    ],
    port: opts.port,
    host: opts.host,
    afterMiddlewares: [...(opts.afterMiddlewares || [])],
    onDevCompileDone: opts.onDevCompileDone,
  });
}
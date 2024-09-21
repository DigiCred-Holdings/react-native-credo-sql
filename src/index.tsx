import { NativeModules, Platform } from 'react-native';
import SQLWalletModule from './wallet/SQLWalletModule';
const LINKING_ERROR =
  `The package 'react-native-credo-sql' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const CredoSql = NativeModules.CredoSql
  ? NativeModules.CredoSql
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

export function multiply(a: number, b: number): Promise<number> {
  return CredoSql.multiply(a, b);
}

export { SQLWalletModule };

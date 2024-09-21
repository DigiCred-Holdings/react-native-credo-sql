import type { DependencyManager, Module } from '@credo-ts/core';

import { SQLWallet } from './SQLWallet';

import { CredoError, InjectionSymbols } from '@credo-ts/core';
import { SQLiteStorageService } from './SQLStorageService';
import type { FeatureRegistry } from '@credo-ts/core/build/agent/FeatureRegistry';

export default class SQLWalletModule implements Module {
  public register(
    dependencyManager: DependencyManager,
    featureRegistry: FeatureRegistry
  ): void {
    console.log(featureRegistry);
    if (dependencyManager.isRegistered(InjectionSymbols.Wallet)) {
      throw new CredoError('There is an instance of Wallet already registered');
    } else {
      dependencyManager.registerContextScoped(
        InjectionSymbols.Wallet,
        SQLWallet
      );
    }

    if (dependencyManager.isRegistered(InjectionSymbols.StorageService)) {
      throw new CredoError(
        'There is an instance of StorageService already registered'
      );
    } else {
      dependencyManager.registerSingleton(
        InjectionSymbols.StorageService,
        SQLiteStorageService
      );
    }
  }
}

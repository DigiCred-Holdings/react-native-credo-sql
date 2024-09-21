import { useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Agent, type InitConfig } from '@credo-ts/core';
import { SQLWalletModule } from 'react-native-credo-sql';
import { agentDependencies } from '@credo-ts/react-native';

export default function App() {
  const [result, _] = useState<number | undefined>();

  useEffect(() => {
    async function initialize() {
      const config: InitConfig = {
        label: 'docs-agent-nodejs',
        walletConfig: {
          id: 'wallet-id',
          key: 'testkey0000000000000000000000000',
        },
      };
      const agent = new Agent({
        config,
        dependencies: agentDependencies,
        modules: {
          sql: new SQLWalletModule(),
        },
      });
      await agent.initialize();
    }
    initialize();
  }, []);

  return (
    <View style={styles.container}>
      <Text>Result: {result}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
});

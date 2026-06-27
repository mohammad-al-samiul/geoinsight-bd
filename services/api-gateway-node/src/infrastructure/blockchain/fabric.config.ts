import { readFileSync } from "fs";
import { resolve } from "path";

export interface FabricSettings {
  enabled: boolean;
  connectionProfilePath: string;
  walletPath: string;
  identityLabel: string;
  channelName: string;
  chaincodeName: string;
  discoveryAsLocalhost: boolean;
}

export function loadConnectionProfile(profilePath: string): Record<string, unknown> {
  const absolute = resolve(profilePath);
  const raw = readFileSync(absolute, "utf8");
  return JSON.parse(raw) as Record<string, unknown>;
}

export function resolveFabricSettings(env: {
  fabricEnabled: boolean;
  fabricConnectionProfilePath: string;
  fabricWalletPath: string;
  fabricIdentityLabel: string;
  fabricChannelName: string;
  fabricChaincodeName: string;
  fabricDiscoveryAsLocalhost: boolean;
}): FabricSettings {
  return {
    enabled: env.fabricEnabled,
    connectionProfilePath: env.fabricConnectionProfilePath,
    walletPath: env.fabricWalletPath,
    identityLabel: env.fabricIdentityLabel,
    channelName: env.fabricChannelName,
    chaincodeName: env.fabricChaincodeName,
    discoveryAsLocalhost: env.fabricDiscoveryAsLocalhost,
  };
}

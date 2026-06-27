import { env } from "../config/env";
import { RbacMiddleware } from "../middlewares/rbac.middleware";
import { adminScopeService } from "../../shared/scope/admin-scope.service";
import { auditService } from "../../shared/audit/audit.service";
import { FabricGatewayClient } from "../../infrastructure/blockchain/fabric.client";
import { resolveFabricSettings } from "../../infrastructure/blockchain/fabric.config";
import { BlockchainQueueRepository } from "../../infrastructure/blockchain/queue.repository";
import { BlockchainMilestoneService } from "../../modules/blockchain/blockchain.service";
import { BlockchainRetryWorker } from "../../infrastructure/blockchain/retry.worker";

const fabricSettings = resolveFabricSettings({
  fabricEnabled: env.FABRIC_ENABLED,
  fabricConnectionProfilePath: env.FABRIC_CONNECTION_PROFILE_PATH,
  fabricWalletPath: env.FABRIC_WALLET_PATH,
  fabricIdentityLabel: env.FABRIC_IDENTITY_LABEL,
  fabricChannelName: env.FABRIC_CHANNEL_NAME,
  fabricChaincodeName: env.FABRIC_CHAINCODE_NAME,
  fabricDiscoveryAsLocalhost: env.FABRIC_DISCOVERY_AS_LOCALHOST,
});

const fabricClient = new FabricGatewayClient(fabricSettings);
const blockchainQueueRepo = new BlockchainQueueRepository();

const blockchainService = new BlockchainMilestoneService(
  fabricClient,
  blockchainQueueRepo,
  env.FABRIC_CHAINCODE_NAME,
  env.FABRIC_MAX_RETRIES,
);

const blockchainRetryWorker = new BlockchainRetryWorker(
  blockchainService,
  env.FABRIC_RETRY_INTERVAL_MS,
);

export const container = {
  adminScopeService,
  auditService,
  rbac: new RbacMiddleware(adminScopeService),
  fabricClient,
  blockchainQueueRepo,
  blockchainService,
  blockchainRetryWorker,
} as const;

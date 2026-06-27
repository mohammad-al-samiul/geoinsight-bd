import { Gateway, Wallets } from "fabric-network";
import { resolve } from "path";
import { FabricSettings, loadConnectionProfile } from "./fabric.config";
import { MilestonePayload } from "./payload-hasher";

export interface FabricSubmitResult {
  transactionId: string;
  payload: Buffer;
}

export interface IFabricGatewayClient {
  submitProjectMilestone(
    payload: MilestonePayload,
    payloadHash: string,
  ): Promise<FabricSubmitResult>;
  ping(): Promise<boolean>;
  disconnect(): Promise<void>;
}

export class FabricGatewayClient implements IFabricGatewayClient {
  private gateway: Gateway | null = null;
  private connecting: Promise<Gateway> | null = null;

  constructor(private readonly settings: FabricSettings) {}

  async submitProjectMilestone(
    payload: MilestonePayload,
    payloadHash: string,
  ): Promise<FabricSubmitResult> {
    if (!this.settings.enabled) {
      throw new Error("Hyperledger Fabric integration is disabled");
    }

    const gateway = await this.getGateway();
    const network = await gateway.getNetwork(this.settings.channelName);
    const contract = network.getContract(this.settings.chaincodeName);

    const txn = contract.createTransaction("SubmitProjectMilestone");
    const txBuffer = await txn.submit(
      payload.projectId,
      payload.representativeId,
      payload.allocatedBudget,
      payload.spendingVariance,
      payload.progressPercentage,
      payloadHash,
    );

    return {
      transactionId: txn.getTransactionId(),
      payload: Buffer.from(txBuffer),
    };
  }

  async ping(): Promise<boolean> {
    if (!this.settings.enabled) return false;

    try {
      const gateway = await this.getGateway();
      await gateway.getNetwork(this.settings.channelName);
      return true;
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.gateway) {
      this.gateway.disconnect();
      this.gateway = null;
    }
    this.connecting = null;
  }

  private async getGateway(): Promise<Gateway> {
    if (this.gateway) return this.gateway;

    if (!this.connecting) {
      this.connecting = this.connect();
    }

    this.gateway = await this.connecting;
    return this.gateway;
  }

  private async connect(): Promise<Gateway> {
    const gateway = new Gateway();
    const connectionProfile = loadConnectionProfile(this.settings.connectionProfilePath);
    const wallet = await Wallets.newFileSystemWallet(resolve(this.settings.walletPath));

    const identity = await wallet.get(this.settings.identityLabel);
    if (!identity) {
      throw new Error(`Fabric identity '${this.settings.identityLabel}' not found in wallet`);
    }

    await gateway.connect(connectionProfile, {
      wallet,
      identity: this.settings.identityLabel,
      discovery: {
        enabled: true,
        asLocalhost: this.settings.discoveryAsLocalhost,
      },
    });

    return gateway;
  }
}

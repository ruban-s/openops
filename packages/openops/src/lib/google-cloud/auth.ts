import { BlockAuth } from '@openops/blocks-framework';
import { SharedSystemProp, system } from '@openops/server-shared';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { runCliCommand } from '../cli-command-wrapper';
import { useTempFile } from '../use-temp-file';

const enableHostSession =
  system.getBoolean(SharedSystemProp.ENABLE_HOST_SESSION) ?? false;

export const googleCloudAuth = BlockAuth.CustomAuth({
  props: {
    keyFileContent: BlockAuth.SecretText({
      displayName: 'Key file content',
      description: 'Provide the content of the service-account key file.',
      required: true,
    }),
  },
  required: !enableHostSession,
  validate: async ({ auth }) => {
    try {
      await runAuthCommand(auth.keyFileContent);
      return {
        valid: true,
      };
    } catch (e) {
      return {
        valid: false,
        error: (e as Error).message,
      };
    }
  },
});

async function runAuthCommand(keyObject: string): Promise<string> {
  const gcpConfigDir = await getDefaultCloudSDKConfig();

  const envVars: Record<string, string> = {
    PATH: process.env['PATH'] || '',
    CLOUDSDK_CORE_DISABLE_PROMPTS: '1',
    CLOUDSDK_CONFIG: gcpConfigDir,
  };

  return await loginGCPWithKeyObject(keyObject, envVars);
}

export async function getDefaultCloudSDKConfig(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'gcloud-config'));
}

export async function loginGCPWithKeyObject(keyObject: string, envVars: any) {
  const result = await useTempFile(keyObject, async (filePath) => {
    const loginCommand = `gcloud auth activate-service-account --key-file=${filePath}`;
    return await runCliCommand(loginCommand, 'gcloud', envVars);
  });

  return result;
}

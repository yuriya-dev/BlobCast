export const onboardingProfileStoragePrefix = 'blobcast_onboarding_profile';

export function getOnboardingProfileKey(address: string) {
  return `${onboardingProfileStoragePrefix}:${address.toLowerCase()}`;
}

export function formatWalletAddress(address?: string) {
  if (!address) return 'Wallet not connected';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

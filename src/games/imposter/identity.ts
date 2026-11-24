/** Imposter's room identities (see src/components/room/identity.ts). */
import { roomIdentity } from "@/components/room/identity";

export {
  generateRoomCode,
  lastMeRaw,
  parseMe,
  PARTY_HOST,
  type Identity,
} from "@/components/room/identity";

const store = roomIdentity("imposter");

export const identityStorageKey = store.storageKey;
export const IDENTITY_EVENT = store.event;
export const readIdentityRaw = store.readRaw;
export const loadIdentity = store.load;
export const saveIdentity = store.save;
export const saveToken = store.saveToken;
export const saveAvatarPreference = store.saveAvatarPreference;

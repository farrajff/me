import defaultAvatarImg from '../assets/images/creator_avatar_portrait_1794980796833.jpg';
import defaultCoverImg from '../assets/images/profile_cover_architecture_1794980795891.jpg';

const AVATAR_LEGACY_PATH = '/src/assets/images/creator_avatar_portrait_1794980796833.jpg';
const COVER_LEGACY_PATH = '/src/assets/images/profile_cover_architecture_1794980795891.jpg';

export const DEFAULT_AVATAR_URL = defaultAvatarImg;
export const DEFAULT_COVER_URL = defaultCoverImg;

export function resolveAssetUrl(url: string): string {
  if (!url) return '';
  if (url === AVATAR_LEGACY_PATH) return defaultAvatarImg;
  if (url === COVER_LEGACY_PATH) return defaultCoverImg;
  return url;
}

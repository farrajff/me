import defaultAvatarImg from '../assets/images/creator_avatar_portrait_1794980796833.jpg';
import defaultCoverImg from '../assets/images/profile_cover_architecture_1794980795891.jpg';

export const CANONICAL_AVATAR_PATH = '/src/assets/images/creator_avatar_portrait_1794980796833.jpg';
export const CANONICAL_COVER_PATH = '/src/assets/images/profile_cover_architecture_1794980795891.jpg';

export const DEFAULT_AVATAR_URL = defaultAvatarImg;
export const DEFAULT_COVER_URL = defaultCoverImg;

export function resolveAssetUrl(url: string): string {
  if (!url) return '';
  if (
    url === CANONICAL_AVATAR_PATH ||
    url.includes('creator_avatar_portrait_')
  ) {
    return defaultAvatarImg;
  }
  if (
    url === CANONICAL_COVER_PATH ||
    url.includes('profile_cover_architecture_')
  ) {
    return defaultCoverImg;
  }
  return url;
}

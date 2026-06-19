export const ACCESS_TOKEN_COOKIE = "cb_access_token";

export function getKakaoRestApiKey() {
  return process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;
}

export function getKakaoRedirectUri() {
  return process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI;
}

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL;
}

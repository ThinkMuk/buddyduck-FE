import { getKakaoRedirectUri, getKakaoRestApiKey } from "./constants";

const KAKAO_AUTHORIZE_URL = "https://kauth.kakao.com/oauth/authorize";

export function buildKakaoAuthorizeUrl() {
  const params = new URLSearchParams({
    client_id: getKakaoRestApiKey() ?? "",
    redirect_uri: getKakaoRedirectUri() ?? "",
    response_type: "code",
  });

  return `${KAKAO_AUTHORIZE_URL}?${params.toString()}`;
}

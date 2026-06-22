import axios from "axios";
import { env } from "../config/env";
import { assertSuccess, unwrapData } from "../utils/apiResponse";
import { getRefreshToken, getStoredUser, setRefreshToken, setToken } from "./tokenStorage";
type RefreshData = {
  accessToken?: string;
  refreshToken?: string;
  AccessToken?: string;
  RefreshToken?: string;
};

export const refreshAccessToken = async (): Promise<string> => {
  const refreshToken = getRefreshToken();
  const user = getStoredUser();

  if (!refreshToken || !user?.email) {
    throw {
      message: "لا توجد جلسة صالحة. يرجى تسجيل الدخول مجدداً.",
    };
  }

  const response = await axios.post(
    `${env.apiBaseUrl}/auth/refresh`,
    {
      refreshToken,
      email: user.email,
    },
    {
      headers: { "Content-Type": "application/json" },
    },
  );

  assertSuccess(response.data);

  const data = unwrapData<RefreshData>(response.data);
  const accessToken = data?.accessToken ?? data?.AccessToken;

  if (!accessToken) {
    throw {
      message: "تعذر تجديد الجلسة. يرجى تسجيل الدخول مجدداً.",
    };
  }

  setToken(accessToken);
  if (data?.refreshToken ?? data?.RefreshToken) {
    setRefreshToken((data.refreshToken ?? data.RefreshToken)!);
  }

  return accessToken;
};
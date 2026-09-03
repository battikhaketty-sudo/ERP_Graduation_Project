import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { isAuthRoute } from "../auth/config";
import { env } from "../config/env";
import { redirectToLogin } from "../router/navigation";
import { extractApiErrorCode, extractApiRawText, formatApiErrorMessage } from "../utils/apiResponse";
import { ensureAccessTokenFresh, refreshAccessToken, stopAccessTokenRefreshLoop } from "./tokenRefresh";
import { clearSession, getToken } from "./tokenStorage";

const usesViteProxy = !/^https?:\/\//i.test(env.apiBaseUrl);

const SESSION_EXPIRED_MESSAGE = "انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً.";

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const getErrorFallback = (status: number, url?: string) => {
  if (isAuthRoute(url)) {
    if (status >= 500) {
      return "خطأ في السيرفر. حاول مجدداً أو تواصل مع الإدارة.";
    }
    if (url?.includes("/auth/login")) {
      if (status === 400) {
        return "بيانات الدخول غير صحيحة. تحقق من البريد وكلمة المرور.";
      }
      return `تعذر تسجيل الدخول (${status}).`;
    }
    if (status === 400) {
      return "تعذر إكمال العملية. تحقق من البيانات ثم أعد المحاولة.";
    }
    return `تعذر إكمال العملية (${status}).`;
  }

  if (status >= 500) {
    return "خطأ داخلي في السيرفر (500). حاول مجدداً أو تحقق من البيانات المرسلة.";
  }
  if (status === 403) {
    return "لا يمكنك تنفيذ هذه العملية. حسابك لا يملك الصلاحية المطلوبة.";
  }
  if (status === 400) {
    return "طلب غير صالح (400). تحقق من الحقول المطلوبة.";
  }
  return `حدث خطأ من السيرفر (${status}).`;
};

const api = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  async (config) => {
    if (!isAuthRoute(config.url)) {
      const token = (await ensureAccessTokenFresh()) ?? getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    if (config.data instanceof FormData) {
      // Browser must set multipart/form-data with boundary — never force JSON.
      if (typeof config.headers.set === "function") {
        config.headers.set("Content-Type", false);
      } else if (typeof config.headers.delete === "function") {
        config.headers.delete("Content-Type");
        config.headers.delete("content-type");
      } else {
        delete config.headers["Content-Type"];
        delete config.headers["content-type"];
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

const handleUnauthorized = (message = SESSION_EXPIRED_MESSAGE) => {
  stopAccessTokenRefreshLoop();
  clearSession();
  redirectToLogin(message);
  throw { message };
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      const originalRequest = error.config as RetriableRequestConfig | undefined;

      console.error(
        `API ${status}:`,
        typeof data === "string" ? data : JSON.stringify(data, null, 2),
      );

      if (
        status === 401 &&
        originalRequest &&
        !originalRequest._retry &&
        !isAuthRoute(originalRequest.url)
      ) {
        originalRequest._retry = true;

        try {
          const newToken = await refreshAccessToken();
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch {
          return handleUnauthorized();
        }
      }

      if (status === 401) {
        if (isAuthRoute(originalRequest?.url)) {
          throw {
            code: extractApiErrorCode(data),
            rawApi: extractApiRawText(data),
            message: formatApiErrorMessage(
              data as Record<string, unknown> | string | undefined,
              originalRequest?.url?.includes("/auth/login")
                ? "البريد الإلكتروني أو كلمة المرور غير صحيحة."
                : "تعذر إكمال العملية. تحقق من البيانات ثم أعد المحاولة.",
            ),
          };
        }

        return handleUnauthorized();
      }

      if (status === 404) {
        const friendly = formatApiErrorMessage(data, "");
        const isLogin = originalRequest?.url?.includes("/auth/login");
        const isHtml =
          typeof data === "string" &&
          (data.includes("<html") ||
            data.includes("<?xml") ||
            data.toLowerCase().includes("under construction"));

        throw {
          status,
          code: extractApiErrorCode(data),
          rawApi: extractApiRawText(data),
          message:
            isHtml
              ? "خدمة الـ API غير متاحة حالياً (السيرفر قيد النشر أو تحت الإنشاء). انتظر قليلاً ثم أعد المحاولة."
              : friendly ||
                (isLogin
                  ? "تعذر الوصول لخدمة تسجيل الدخول. تأكد من إعدادات الاستضافة (proxy للـ API)."
                  : "العنصر غير موجود."),
        };
      }

      throw {
        status,
        code: extractApiErrorCode(data),
        rawApi: extractApiRawText(data),
        message: formatApiErrorMessage(
          data as Record<string, unknown> | string | undefined,
          getErrorFallback(status, originalRequest?.url),
        ),
      };
    }

    if (error.request) {
      throw {
        message: usesViteProxy
          ? "تعذر الوصول للسيرفر. شغّل `npm run dev` ثم أعد المحاولة، وتأكد أن السيرفر متاح."
          : "تعذر الوصول للسيرفر (CORS). في التطوير اجعل VITE_API_BASE_URL=/api/v1 لاستخدام proxy في Vite.",
      };
    }

    throw { message: error.message };
  },
);

export default api;

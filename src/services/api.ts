import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { isAuthRoute } from "../auth/config";
import { env } from "../config/env";
import { redirectToLogin } from "../router/navigation";
import { formatApiErrorMessage } from "../utils/apiResponse";
import { refreshAccessToken } from "./tokenRefresh";
import { clearSession, getToken } from "./tokenStorage";

const usesViteProxy = !/^https?:\/\//i.test(env.apiBaseUrl);

const SESSION_EXPIRED_MESSAGE = "انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً.";

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const getErrorFallback = (status: number, url?: string) => {
  if (isAuthRoute(url)) {
    if (status >= 500) {
      return "خطأ في السيرفر أثناء تسجيل الدخول. حاول مجدداً أو تواصل مع الإدارة.";
    }
    if (status === 400) {
      return "بيانات الدخول غير صحيحة. تحقق من البريد وكلمة المرور.";
    }
    return `تعذر تسجيل الدخول (${status}).`;
  }

  if (status >= 500) {
    return "خطأ داخلي في السيرفر (500). حاول مجدداً أو تحقق من البيانات المرسلة.";
  }
  if (status === 400) {
    return "طلب غير صالح (400). تحقق من الحقول المطلوبة.";
  }
  if (status === 403) {
    return "ليس لديك صلاحية لتنفيذ هذا الإجراء (403).";
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
  (config) => {
    const token = getToken();

    if (token && !isAuthRoute(config.url)) {
      config.headers.Authorization = `Bearer ${token}`;
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

let refreshPromise: Promise<string> | null = null;

const handleUnauthorized = (message = SESSION_EXPIRED_MESSAGE) => {
  clearSession();
  redirectToLogin(message);
  throw { message };
};

const refreshSession = async () => {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
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
          const newToken = await refreshSession();
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch {
          return handleUnauthorized();
        }
      }

      if (status === 401) {
        if (originalRequest?.url?.includes("/auth/login")) {
          throw {
            message: formatApiErrorMessage(
              data as Record<string, unknown> | string | undefined,
              "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
            ),
          };
        }

        return handleUnauthorized();
      }

      if (status === 404) {
        const friendly = formatApiErrorMessage(data, "");
        const isLogin = originalRequest?.url?.includes("/auth/login");

        throw {
          status,
          message:
            friendly ||
            (isLogin
              ? "تعذر الوصول لخدمة تسجيل الدخول. تأكد من إعدادات الاستضافة (proxy للـ API)."
              : "العنصر غير موجود."),
        };
      }

      throw {
        status,
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

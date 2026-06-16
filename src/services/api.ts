import axios from "axios";
import { env } from "../config/env";
import { formatApiErrorMessage } from "../utils/apiResponse";
import { clearSession, getToken } from "./tokenStorage";

const usesViteProxy = !/^https?:\/\//i.test(env.apiBaseUrl);

const api = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      if (typeof config.headers.delete === "function") {
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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      console.error(
        `API ${status}:`,
        typeof data === "string" ? data : JSON.stringify(data, null, 2),
      );

      if (status === 401) {
        clearSession();
        throw {
          message:
            "غير مصرح (401): يجب تسجيل الدخول أولا أو توفير token صالح قبل طلبات الموظفين.",
        };
      }

      if (status === 404) {
        const friendly = formatApiErrorMessage(data, "");

        throw {
          message:
            friendly ||
            "العنصر غير موجود. تأكد من رقم المدير أو قسم الأب الصحيح من النظام.",
        };
      }

      throw {
        message: formatApiErrorMessage(
          data as Record<string, unknown> | string | undefined,
          status >= 500
            ? "خطأ داخلي في السيرفر (500). غالباً القسم بلا مدير، أو البريد مستخدم مسبقاً."
            : status === 400
              ? "طلب غير صالح (400). تحقق من البريد وكلمة المرور والقسم ونوع العقد."
              : `حدث خطأ من السيرفر (${status}).`,
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

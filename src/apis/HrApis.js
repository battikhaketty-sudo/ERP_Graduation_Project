import axios from "axios";

// =====================================
// AXIOS INSTANCE
// =====================================

const api = axios.create({
  baseURL: "/api/v1", // ✅ مهم مع proxy
  headers: {
    "Content-Type": "application/json",
  },
});

// =====================================
// REQUEST INTERCEPTOR (TOKEN)
// =====================================

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (
      token &&
      token !== "undefined" &&
      token !== "null"
    ) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// =====================================
// RESPONSE INTERCEPTOR (ERROR HANDLING)
// =====================================

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log("🔥 AXIOS ERROR:", error);

    if (error.response) {
      console.log("🔥 SERVER RESPONSE:", error.response);

      // ✅ لو التوكن غير صالح/منتهي يرجع 401: احذف التوكن تلقائيًا
      if (error.response.status === 401) {
        localStorage.removeItem("token");
      }

      throw {
        message:
          error.response.data?.message ||
          JSON.stringify(error.response.data) ||
          "Server error",
      };
    }

    if (error.request) {
      throw { message: "No response from server" };
    }

    throw { message: error.message };
  }
);
// =====================================
// AUTH APIs
// =====================================

// LOGIN
export const login = async (data) => {
  const res = await api.post("/auth/login", data);
  return res.data;
};

// LOGOUT
export const logout = async () => {
  const res = await api.post("/auth/logout");
  return res.data;
};

// REFRESH TOKEN
export const refreshToken = async (data) => {
  const res = await api.post("/auth/refresh", data);
  return res.data;
};

// SIGN UP
export const signUp = async (data) => {
  const res = await api.post("/auth/sign-up", data);
  return res.data;
};

// CONFIRM EMAIL
export const confirmEmail = async (data) => {
  const res = await api.post("/auth/confirm-email", data);
  return res.data;
};

// FORGOT PASSWORD
export const forgotPassword = async (data) => {
  const res = await api.post("/auth/forgot-password", data);
  return res.data;
};

// RESET PASSWORD
export const resetPassword = async (data) => {
  const res = await api.post("/auth/reset-password", data);
  return res.data;
};

// CHANGE PASSWORD
export const changePassword = async (data) => {
  const res = await api.post("/auth/change-password", data);
  return res.data;
};

// RESEND EMAIL CODE
export const resendEmailCode = async (data) => {
  const res = await api.post(
    "/auth/resend-email-confirm-code",
    data
  );
  return res.data;
};

// =====================================
// ATTENDENCE APIs
// =====================================

// GET ALL
export const getAttendences = async (
  page = 1,
  limit = 10
) => {
  const res = await api.get("/attendences", {
    params: { page, limit },
  });
  return res.data;
};

// GET BY ID
export const getAttendenceById = async (id) => {
  const res = await api.get(`/attendences/${id}`);
  return res.data;
};

// ADD
export const addAttendence = async (data) => {
  const res = await api.post("/attendences", data);
  return res.data;
};

// UPDATE
export const updateAttendence = async (id, data) => {
  const res = await api.put(
    `/attendences/${id}`,
    data
  );
  return res.data;
};

// DELETE
export const deleteAttendence = async (id) => {
  const res = await api.delete(
    `/attendences/${id}`
  );
  return res.data;
};

// APPROVE
export const approveAttendence = async (id) => {
  const res = await api.put(
    `/attendences/${id}/approve`
  );
  return res.data;
};

// REFUSE
export const refuseAttendence = async (id) => {
  const res = await api.put(
    `/attendences/${id}/refuse`
  );
  return res.data;
};

// CHECK IN
export const checkIn = async () => {
  const res = await api.post(
    "/attendences/check-in"
  );
  return res.data;
};
// CHECK OUT
export const checkOut = async (id) => {
  const res = await api.put(
    `/attendences/${id}/check-out`
  );
  return res.data;
};

// =====================================
// OTHER APIs
// =====================================

export const getApiRequests = async (params) => {
  const res = await api.get("/api-requests", {
    params,
  });
  return res.data;
};
export const addEmployee = async (data) => {
  const formData = new FormData();

  // 🔹 Citizenship
  formData.append("CitizenshipInfo.IdentificationNo", data.identificationNo);
  formData.append("CitizenshipInfo.Nationality", data.nationality);

  // 🔹 Personal
  formData.append("PersonalInfo.LegalName", data.legalName);
  formData.append("PersonalInfo.Gender", data.gender);
  formData.append("PersonalInfo.MobileNumber", data.mobileNumber);
  formData.append("PersonalInfo.Birthday", data.birthday);

  // 🔹 Auth
  formData.append("Email", data.email);
  formData.append("Password", data.password);

  // 🔹 Work
  formData.append("WorkInfo.ContractTimeRangeFrom", data.contractFrom);

  const res = await api.post("/employees", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};
// =====================================
// EXPORT
// =====================================

export default api;
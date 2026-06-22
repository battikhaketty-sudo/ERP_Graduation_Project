import React, { useState } from "react";
import { login } from "./apis/HrApis";

const Login = ({ setIsLoggedIn }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ✅ الاسم الصح
  const handleLogin = async () => {
  // ✅ قبل الإرسال: تحقق سريع من المدخلات
  if (!email || !password) {
    alert("Email و Password مطلوبين");
    return;
  }

  try {
    const payload = { email, password };
    console.log("🚀 LOGIN PAYLOAD:", payload);

    const res = await login(payload);

    console.log("FULL RESPONSE:", res);

    const token =
      res?.accessToken ||
      res?.data?.accessToken ||
      res?.access_token ||
      res?.data?.access_token ||
      res?.token;

    if (!token) {
      alert("Token not found");
      return;
    }

    // ✅ حفظ التوكن (هذا أهم سطر)
    localStorage.setItem("token", token);

    console.log("✅ TOKEN SAVED:", localStorage.getItem("token"));

    setIsLoggedIn(true);

    // ✅ لو التوكن جديد نعيد تعيين الهيدر عبر reload خفيف (يمنع بقاء headers قديمة)
    // (لا يغير أي ملفات أخرى)
    // https://axios config يُقرأ من localStorage عند كل request.


  } catch (err) {
    console.log("LOGIN ERROR:", err);
    const serverData = err?.response?.data;

    const msg =
      err?.message ||
      err?.response?.data?.message ||
      (typeof serverData === "string" ? serverData : null) ||
      (serverData ? JSON.stringify(serverData) : null) ||
      "Login failed";

    console.log("❌ LOGIN ERROR DATA:", serverData);
    alert(typeof msg === "string" ? msg : "Login failed");
  }
};

  return (
    <div style={{ padding: 40 }}>
      <h2>Login</h2>

      <input
        type="email"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />

      <br /><br />

      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />

      <br /><br />

      {/* ✅ استخدمي handleLogin */}
      <button onClick={handleLogin}>
        Login
      </button>
    </div>
  );
};

export default Login;
import React, {
  useEffect,
  useState,
} from "react";

import Login from "./Login";
import Attendences from "./Attendences";

function App() {
  const [isLoggedIn, setIsLoggedIn] =
    useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    // ✅ تأكد من صحة التوكن
    const ok =
      typeof token === "string" &&
      token.trim() &&
      token !== "undefined" &&
      token !== "null";

    // لتجنب تحذير react-hooks/set-state-in-effect، استخدم fetch lazy بدون setState مباشرة
    if (ok) {
      queueMicrotask(() => setIsLoggedIn(true));
    }

  }, []);


  // ✅ صفحة اللوغين
  if (!isLoggedIn) {
    // ملاحظة: في التطوير قد يبقى token قديم في المتصفح
    // لذلك نضمن عرض Login دائماً عند عدم وجود توكن صالح
    return <Login setIsLoggedIn={setIsLoggedIn} />;
  }

  // ✅ بعد اللوغين
  return <Attendences />;
}

export default App;
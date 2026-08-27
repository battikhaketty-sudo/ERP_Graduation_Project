import React, { useEffect, useState } from "react";
import "./Styles/HrStyle.css";
import {
  getAttendences,
  checkIn,
  checkOut,
  deleteAttendence,
  approveAttendence,
  refuseAttendence,
} from "./Apis/HrApis";

const Attendences = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  const fetchAttendances = async () => {
    try {
      setLoading(true);
      const res = await getAttendences(1, 50);

      const list =
        res?.data?.items ||
        res?.data?.page?.items ||
        res?.data?.page?.content ||
        res?.data?.page ||
        res?.items ||
        res?.data ||
        res ||
        [];

      const finalData = Array.isArray(list)
        ? list
        : Array.isArray(list?.items)
          ? list.items
          : Array.isArray(list?.content)
            ? list.content
            : [];

      setData(finalData);
    } catch (error) {
      console.error("❌ ATTENDENCES FETCH ERROR:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // لتجنب تحذير lint الخاص بـ setState داخل effect بشكل مباشر
    queueMicrotask(() => fetchAttendances());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleDelete = async (id) => {
    try {
      await deleteAttendence(id);
      alert("تم حذف السجل");
      setOpenMenuId(null);
      await fetchAttendances();
    } catch (err) {
      alert(err?.message || "فشل الحذف");
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveAttendence(id);
      alert("تم قبول السجل");
      setOpenMenuId(null);
      await fetchAttendances();
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || "فشل القبول");
    }
  };

  const handleRefuse = async (id) => {
    try {
      await refuseAttendence(id);
      alert("تم رفض السجل");
      setOpenMenuId(null);
      await fetchAttendances();
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || "فشل الرفض");
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "-";

    if (
      typeof timeStr === "string" &&
      !timeStr.includes("-") &&
      timeStr.length <= 8
    ) {
      return timeStr;
    }

    try {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return timeStr;
      return date.toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return timeStr;
    }
  };

  const handleCheckIn = async () => {
    try {
      setLoading(true);
      await checkIn();
      alert("تم تسجيل الحضور بنجاح!");
      await fetchAttendances();
    } catch (err) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          "حدث خطأ أثناء تسجيل الحضور"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async (id) => {
    try {
      setLoading(true);
      await checkOut(id);
      alert("تم تسجيل الانصراف بنجاح!");
      await fetchAttendances();
    } catch (err) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          "حدث خطأ أثناء تسجيل الانصراف"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hr-page">
      <div className="hr-right-margin">
        <div className="hr-right-nav">
          <img src="public/assets/logo.png" alt="logo" />
          <div className="hr-right-nav-title">HR System </div>
          <button className="hr-right-nav-item">🏠 <span>الرئيسية</span></button>
          <button className="hr-right-nav-item">👥 <span>الموظفين</span></button>
          <button className="hr-right-nav-item">🏢 <span>الأقسام</span></button>
           <button className="hr-right-nav-item">🏢 <span>قسم HR</span></button>
          <button className="hr-right-nav-item">📚 <span>Learning</span></button>
          <button className="hr-right-nav-item">🗒️ <span>Memo</span></button>
        </div>
      </div>

      <div className="topbar">
        <div className="title">
          <h3> قسم HR</h3>
          <span className="count">15 قسم</span>
        </div>

        <div className="search-section">
          <div className="search-box">
            <input placeholder="ابحث عن قسم محدد" />
          </div>
          <button className="add-dept">+ إضافة قسم جديد</button>
        </div>
      </div>

      <div className="stats-card">
        <div className="stats-right">
          <h4>إحصائيات الموظفين</h4>
          <div className="circles">
            <div>
              <div className="circle">24</div>
              <p>عدد الموظفين</p>
            </div>
            <div>
              <div className="circle">{data.length}</div>
              <p>الحضور اليوم</p>
            </div>
          </div>
        </div>
        <div className="stats-left">
          <img src="public/assets/HRIMG.jpg" alt="stats-icon" />
        </div>
      </div>

      <div className="tabs">
        <button>إدارة أنواع العقود</button>
        <button>إدارة الأقسام</button>
        <button>إدارة المهارات</button>
        <button>إدارة الأدوار الوظيفية</button>
        <button className="active">الحضور والدوام</button>
      </div>

      <div className="table-card">
        <div className="table-actions">
          <button className="addrecord"> ➕ إضافة سجل جديد </button>
          <button className="checkin" onClick={handleCheckIn} disabled={loading}>
            {loading ? "جاري العملية..." : "➕ تسجيل حضور (Check-In)"}
          </button>
        </div>

        {loading && (
          <p style={{ textAlign: "center", padding: "10px", color: "#3498db" }}>
            جاري تحميل البيانات...
          </p>
        )}

        <table>
          <thead>
            <tr>
              <th>رقم السجل</th>
              <th>رقم الموظف</th>
              <th>اسم الموظف</th>
              <th>وقت الدخول</th>
              <th>وقت الخروج</th>
              <th>تسجيل الخروج</th>
              <th>عدد الساعات</th>
              <th>الحالة</th>
            </tr>
          </thead>

          <tbody>
            {data.length > 0 ? (
              data.map((item, i) => {
                const itemId = item.id || item.Id || i;
                const employeeId = item.employeeId || item.EmployeeId || "-";
                const legalName = item.legalName || item.LegalName || "موظف تجريبي";
                const checkinTime = item.checkin || item.checkIn || item.CheckIn;
                const checkoutTime = item.checkout || item.checkOut || item.CheckOut;
                const totalHours = item.totalWorkHours || item.TotalWorkHours || "0";

                const statusRaw = item.statusName || item.StatusName || "نشط";
                const status = String(statusRaw)
                  .toLowerCase()
                  .includes("approve")
                  ? "مقبول"
                  : String(statusRaw)
                      .toLowerCase()
                      .includes("refuse")
                    ? "مرفوض"
                    : String(statusRaw)
                        .toLowerCase()
                        .includes("late")
                      ? "متأخر"
                      : "نشط";

                return (
                  <tr key={itemId}>
                    <td>{itemId}</td>
                    <td>{employeeId}</td>
                    <td>{legalName}</td>
                    <td>{formatTime(checkinTime)}</td>
                    <td>{formatTime(checkoutTime)}</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={!!checkoutTime && checkoutTime !== "-"}
                        disabled={loading || (!!checkoutTime && checkoutTime !== "-")}
                        onChange={(e) => {
                          if (e.target.checked) handleCheckOut(itemId);
                        }}
                        style={{ width: 14, height: 14, margin: 0, padding: 0 }}
                      />
                    </td>
                    <td>{totalHours}</td>
                    <td>
                      <span
                        className={`badge status-badge ${
                          String(status).includes("مقبول")
                            ? "badge-approved"
                            : String(status).includes("مرفوض")
                              ? "badge-refused"
                              : String(status).includes("متأخر")
                                ? "badge-late"
                                : "badge-active"
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                    <td style={{ position: "relative" }}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                          alignItems: "flex-start",
                        }}
                      >
                        <span
                          style={{
                            cursor: "pointer",
                            fontSize: "20px",
                            lineHeight: "20px",
                          }}
                          onClick={() =>
                            setOpenMenuId(openMenuId === itemId ? null : itemId)
                          }
                        >
                          ⋮
                        </span>

                        {openMenuId === itemId && (
                          <div
                            style={{
                              position: "absolute",
                              left: "40px",
                              top: "0px",
                              background: "#fff",
                              borderRadius: "10px",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                              padding: "8px 0",
                              minWidth: "150px",
                              zIndex: 999,
                            }}
                          >
                            <div className="menu-item" onClick={() => handleDelete(itemId)}>
                              🗑 حذف
                            </div>
                            <div className="menu-item" onClick={() => handleApprove(itemId)}>
                              ✅ قبول
                            </div>
                            <div className="menu-item" onClick={() => handleRefuse(itemId)}>
                              ❌ رفض
                            </div>
                            <div className="menu-item" onClick={() => handleRefuse(itemId)}>
                           ✏️ تعديل 
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              !loading && (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "20px" }}>
                    لا توجد سجلات حضور. اضغط على "تسجيل حضور" لإضافة أول سجل للوقت الحالي
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Attendences;


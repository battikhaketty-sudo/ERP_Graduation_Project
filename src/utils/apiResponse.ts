export type ApiEnvelope<T> = {
  success?: boolean;
  Success?: boolean;
  code?: string;
  Code?: string;
  data?: T | null;
  Data?: T | null;
};

const API_ERROR_MESSAGES: Record<string, string> = {
  "Auth.Error.InvalidEmailOrPassword": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  "Auth.Error.InvalidEmailOrToken": "انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً.",
  "Auth.Error.EmailNotVerified": "البريد الإلكتروني غير مفعّل. راجع بريدك لتأكيد الحساب.",
  "Auth.Error.InvalidOtp": "رمز التحقق غير صحيح أو منتهٍ.",
  "Auth.Error.InvalidCode": "رمز التأكيد غير صحيح أو منتهٍ.",
  "Auth.Error.OtpExpired": "انتهت صلاحية رمز التحقق. اطلب رمزاً جديداً.",
  "Otp.Error.Activation.NotActive":
    "هذا الحساب غير مفعّل بعد. أكّد بريدك الإلكتروني أولاً ثم أعد تعيين كلمة المرور.",
  "Otp.Error.Invalid": "رمز التحقق غير صحيح أو منتهٍ.",
  "Otp.Error.Expired": "انتهت صلاحية رمز التحقق. اطلب رمزاً جديداً.",
  "Auth.Error.AccountInactive":
    "هذا الحساب غير نشط. تأكيد البريد لا يكفي — يحتاج المسؤول إلى تفعيله ثم تعيدين تسجيل الدخول.",
  "SkillType.Error.Name.Duplicate": "اسم نوع المهارة موجود مسبقاً.",
  "ContractType.Error.Name.Duplicate": "اسم نوع العقد موجود مسبقاً.",
  "Department.Error.Name.Duplicate": "اسم القسم موجود مسبقاً.",
  "WorkingSchedule.Error.Name.Duplicate": "اسم جدول العمل موجود مسبقاً.",
  "WorkingSchedule.Error.InvalidPeriod": "فترة العمل غير صالحة. تأكد من الأوقات والأيام.",
  "Project.Error.Name.Duplicate": "اسم المشروع موجود مسبقاً.",
  "Project.Error.NotFound": "المشروع غير موجود.",
  "ProjectInvitation.Error.NotFound": "الدعوة غير موجودة.",
  "ProjectInvitation.Error.AlreadyResponded": "تم الرد على هذه الدعوة مسبقاً.",
  "ProjectInvitation.Error.AlreadyExists":
    "لا يمكن إرسال الدعوة: هذا الموظف لديه دعوة أو عضوية مسجّلة مسبقاً.",
  "ProjectInvitation.Error.AlreadyInvited":
    "لا يمكن إرسال الدعوة: توجد دعوة معلّقة لهذا الموظف.",
  "ProjectInvitation.Error.AlreadyMember":
    "لا يمكن دعوة هذا الموظف لأنه عضو في مشروع مسبقاً. النظام يسمح بعضوية مشروع واحد فقط.",
  "ProjectInvitation.Error.InvitedEmployeeId.AlreadyMember":
    "لا يمكن دعوة هذا الموظف لأنه عضو في مشروع مسبقاً. النظام يسمح بعضوية مشروع واحد فقط.",
  "ProjectInvitation.Error.EmployeeAlreadyMember":
    "لا يمكن دعوة هذا الموظف لأنه عضو في مشروع مسبقاً. النظام يسمح بعضوية مشروع واحد فقط.",
  "ProjectInvitation.Error.InvalidExpiry": "تاريخ انتهاء الدعوة غير صالح. اختر يوماً لاحقاً.",
  "ProjectInvitation.Error.ExpiresAtInPast":
    "تاريخ انتهاء الدعوة يجب أن يكون في المستقبل. تاريخ اليوم يُحسب من منتصف الليل — جرّبي الغد.",
  "ProjectInvitation.Error.ExpiryInPast":
    "تاريخ انتهاء الدعوة يجب أن يكون في المستقبل. تاريخ اليوم يُحسب من منتصف الليل — جرّبي الغد.",
  "ProjectMember.Error.AlreadyExists":
    "لا يمكن ضم هذا الموظف لأنه عضو في مشروع مسبقاً. النظام يسمح بعضوية مشروع واحد فقط.",
  "ProjectMember.Error.AlreadyMember":
    "لا يمكن ضم هذا الموظف لأنه عضو في مشروع مسبقاً. النظام يسمح بعضوية مشروع واحد فقط.",
  "ProjectMember.Error.CannotDelete":
    "لا يمكن حذف هذا العضو.",
  "ProjectMember.Error.CannotRemoveManager":
    "لا يمكن حذف مدير المشروع. عيّن مديراً آخر أولاً ثم أعد المحاولة.",
  "ProjectMember.Error.CannotDeleteProjectManager":
    "لا يمكن حذف مدير المشروع. عيّن مديراً آخر أولاً ثم أعد المحاولة.",
  "ProjectMember.Error.ProjectManager":
    "لا يمكن حذف مدير المشروع. عيّن مديراً آخر أولاً ثم أعد المحاولة.",
  "ProjectMember.Error.IsProjectManager":
    "لا يمكن حذف مدير المشروع. عيّن مديراً آخر أولاً ثم أعد المحاولة.",
  "ProjectSection.Error.Name.Duplicate": "اسم القسم موجود مسبقاً في هذا المشروع.",
  "ProjectMember.Error.NotMember":
    "حسابك الحالي ليس عضواً في هذا المشروع، لذلك لا يمكن إنشاء أو تعديل المهام. أضف الموظف المرتبط بحسابك إلى أعضاء المشروع (دعوة ثم قبول) ثم أعد المحاولة.",
  "Employee.Error.Email.Duplicate": "البريد الإلكتروني مستخدم مسبقاً.",
  "User.Error.Email.Duplicate":
    "البريد الإلكتروني مستخدم مسبقاً. قد يكون لموظف موجود أو مؤرشف — استخدم بريداً مختلفاً.",
  "Employee.Error.Department.NotFound": "القسم المحدد غير موجود.",
  "Employee.Error.ContractType.NotFound": "نوع العقد المحدد غير موجود.",
  "Employee.Error.ContractTimeRange.StartShouldBeGreaterThanEnd":
    "تاريخ نهاية العقد يجب أن يكون بعد تاريخ البداية.",
  "Employee.Error.Manager.NotFound": "مدير القسم غير موجود. اختر قسماً له مدير.",
  "Employee.Error.ManagerId.NotFound": "مدير القسم غير موجود. اختر قسماً له مدير.",
  "Employee.Error.Password.Invalid": "كلمة المرور لا تستوفي متطلبات النظام.",
  "Employee.Error.AlreadyArchived": "هذا الموظف مؤرشف مسبقاً.",
  "Employee.Error.NotFound":
    "حسابك غير مرتبط بسجل موظف. لتسجيل حضور موظف آخر استخدم «إضافة سجل حضور».",
  "Global.Error.InternalServerError": "خطأ داخلي في السيرفر. تحقق من البيانات أو جرّب بريداً مختلفاً.",
  "Global.Error.Deletion.YouCannotDeleteThisEntityBecauseItIsReferencedByOtherEntities":
    "لا يمكن الحذف لأن هذا القسم مرتبط بأقسام فرعية أو بيانات أخرى.",
  "Attendence.Error.CannotEditApproved":
    "لا يمكن تعديل سجل حضور مقبول.",
  Forbidden:
    "لا يمكنك تنفيذ هذه العملية. حسابك لا يملك الصلاحية المطلوبة.",
  "Auth.Error.Forbidden":
    "لا يمكنك تنفيذ هذه العملية. حسابك لا يملك الصلاحية المطلوبة.",
  "Authorization.Error.Forbidden":
    "لا يمكنك تنفيذ هذه العملية. حسابك لا يملك الصلاحية المطلوبة.",
  HigherRoleLevelRequired:
    "رتبتك الحالية أقل من المطلوب لهذه العملية. تحتاج دوراً أعلى.",
  HeigherRoleLevelRequired:
    "رتبتك الحالية أقل من المطلوب لهذه العملية. تحتاج دوراً أعلى.",
  "Auth.Error.HigherRoleLevelRequired":
    "رتبتك الحالية أقل من المطلوب لهذه العملية. تحتاج دوراً أعلى.",
  "Auth.Error.HeigherRoleLevelRequired":
    "رتبتك الحالية أقل من المطلوب لهذه العملية. تحتاج دوراً أعلى.",
  "Authorization.Error.HigherRoleLevelRequired":
    "رتبتك الحالية أقل من المطلوب لهذه العملية. تحتاج دوراً أعلى.",
  "Authorization.Error.HeigherRoleLevelRequired":
    "رتبتك الحالية أقل من المطلوب لهذه العملية. تحتاج دوراً أعلى.",
};

const looksLikeErrorCode = (value: string) =>
  /^[A-Za-z]+(?:\.[A-Za-z]+)+$/.test(value.trim());

const lookupMappedMessage = (code: string) => {
  const trimmed = code.trim();
  if (!trimmed) return "";
  if (API_ERROR_MESSAGES[trimmed]) return API_ERROR_MESSAGES[trimmed];

  const parts = trimmed.split(".");
  if (parts.length >= 4) {
    const shortened = `${parts[0]}.${parts[1]}.${parts[parts.length - 1]}`;
    if (API_ERROR_MESSAGES[shortened]) return API_ERROR_MESSAGES[shortened];
  }

  return "";
};

const humanizeErrorCode = (code: string) => {
  const mapped = lookupMappedMessage(code);
  if (mapped) return mapped;

  if (code.includes("Email") && (code.includes("Duplicate") || code.includes("Exists"))) {
    return "البريد الإلكتروني مستخدم مسبقاً. قد يكون لموظف موجود أو مؤرشف — استخدم بريداً مختلفاً.";
  }
  if (
    code.includes("CannotRemoveManager") ||
    code.includes("CannotDeleteProjectManager") ||
    (code.startsWith("Project") &&
      code.includes("Manager") &&
      (code.includes("Remove") || code.includes("Delete") || code.includes("Cannot")))
  ) {
    return "لا يمكن حذف مدير المشروع. عيّن مديراً آخر أولاً ثم أعد المحاولة.";
  }
  if (
    !code.startsWith("Project") &&
    (code.includes("Employee.Error.Manager") ||
      code.includes("Manager.NotFound") ||
      code.includes("ManagerId.NotFound"))
  ) {
    return "مدير القسم غير صالح. تأكد أن القسم له مدير معيّن.";
  }
  if (code.includes("Department")) {
    return "القسم المحدد غير موجود.";
  }
  if (code.includes("ContractType")) {
    return "نوع العقد المحدد غير موجود.";
  }
  if (code.includes("ContractTimeRange")) {
    return "تاريخ نهاية العقد يجب أن يكون بعد تاريخ البداية.";
  }
  if (
    code.includes("saving the entity changes") ||
    code.includes("inner exception") ||
    code.includes("DbUpdateException")
  ) {
    return "فشل حفظ الموظف في قاعدة البيانات. جرّب بريداً إلكترونياً جديداً لم يُستخدم من قبل، وتأكد أن القسم له مدير صالح.";
  }
  if (code.includes("Invitation") && (code.includes("Expir") || code.includes("Past"))) {
    return "تاريخ انتهاء الدعوة يجب أن يكون في المستقبل. جرّبي الغد أو تاريخاً لاحقاً.";
  }
  if (
    code.includes("Invitation") &&
    (code.includes("AlreadyInvited") || code.includes("AlreadyExists") || code.includes("Duplicate"))
  ) {
    return "لا يمكن إرسال الدعوة: توجد دعوة معلّقة لهذا الموظف.";
  }
  if (code.includes("AlreadyMember") || (code.includes("Member") && code.includes("Already"))) {
    return "لا يمكن دعوة هذا الموظف لأنه عضو في مشروع مسبقاً. النظام يسمح بعضوية مشروع واحد فقط.";
  }
  if (code.includes("Invitation") && (code.includes("Already") || code.includes("Exists"))) {
    return "لا يمكن إرسال الدعوة: هذا الموظف لديه عضوية أو دعوة مسجّلة مسبقاً.";
  }
  if (code.includes("Invitation")) {
    return "تعذر إرسال الدعوة. تحقق من البيانات ثم أعد المحاولة.";
  }
  if (code.includes("Otp") && (code.includes("NotActive") || code.includes("Activation"))) {
    return "هذا الحساب غير مفعّل بعد. أكّد بريدك الإلكتروني أولاً ثم أعد تعيين كلمة المرور.";
  }
  if (code.includes("Otp")) {
    return "رمز التحقق غير صحيح أو منتهٍ. اطلب رمزاً جديداً.";
  }
  if (code.includes("Password")) {
    return "كلمة المرور لا تستوفي متطلبات النظام.";
  }
  if (
    code.includes("HigherRoleLevel") ||
    code.includes("HeigherRoleLevel") ||
    code.includes("RoleLevelRequired")
  ) {
    return "رتبتك الحالية أقل من المطلوب لهذه العملية. تحتاج دوراً أعلى.";
  }
  if (code.includes("Forbidden")) {
    return "لا يمكنك تنفيذ هذه العملية. حسابك لا يملك الصلاحية المطلوبة.";
  }
  if (code.includes("Internal") || code.includes("Server")) {
    return "خطأ داخلي في السيرفر. تحقق من اكتمال البيانات.";
  }
  return "تعذر إكمال العملية. تحقق من البيانات ثم أعد المحاولة.";
};

const friendlyFromText = (value: unknown) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const prefixed = trimmed.match(/^(?:خطأ من السيرفر:\s*)(.+)$/);
  const candidate = prefixed?.[1]?.trim() || trimmed;
  const mapped = lookupMappedMessage(candidate);
  if (mapped) return mapped;
  if (looksLikeErrorCode(candidate)) return humanizeErrorCode(candidate);

  if (candidate.startsWith("{")) {
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      const code = String(parsed.code ?? parsed.Code ?? "").trim();
      if (code) {
        return lookupMappedMessage(code) || (looksLikeErrorCode(code) ? humanizeErrorCode(code) : "");
      }
    } catch {
      return "";
    }
  }

  return "";
};

const API_UNAVAILABLE_MESSAGE =
  "خدمة الـ API غير متاحة حالياً (السيرفر قيد النشر أو تحت الإنشاء). انتظر قليلاً ثم أعد المحاولة.";

const looksLikeMarkup = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  return (
    trimmed.startsWith("<") ||
    lower.includes("<!doctype") ||
    lower.includes("<html") ||
    lower.includes("<?xml") ||
    lower.includes("site under construction") ||
    lower.includes("msdeploy")
  );
};

const parseErrorPayload = (payload: unknown): Record<string, unknown> | null => {
  if (!payload) return null;
  if (typeof payload === "string") {
    if (looksLikeMarkup(payload)) {
      return { message: API_UNAVAILABLE_MESSAGE };
    }
    try {
      const parsed = JSON.parse(payload) as unknown;
      if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    } catch {
      return payload.trim() ? { message: payload } : null;
    }
    return null;
  }
  if (typeof payload === "object") return payload as Record<string, unknown>;
  return null;
};

const extractValidationMessages = (errors: unknown) => {
  if (!errors || typeof errors !== "object") return [];

  return Object.entries(errors as Record<string, unknown>).flatMap(([field, value]) => {
    if (Array.isArray(value)) {
      return value.map((item) => `${field}: ${String(item)}`);
    }
    if (typeof value === "string" && value.trim()) {
      return [`${field}: ${value}`];
    }
    return [];
  });
};

export const formatApiErrorMessage = (payload: unknown, fallback = "فشل تنفيذ العملية.") => {
  const envelope = parseErrorPayload(payload);
  if (!envelope) return fallback;

  const code = String(envelope.code ?? envelope.Code ?? "");
  const fromCode = friendlyFromText(code);
  if (fromCode) return fromCode;

  const validationMessages = extractValidationMessages(envelope.errors ?? envelope.Errors);
  if (validationMessages.length > 0) {
    return validationMessages.join(" | ");
  }

  if (code.includes("Duplicate")) {
    return "هذا الاسم موجود مسبقاً.";
  }

  if (code.includes("NotFound")) {
    return "العنصر المطلوب غير موجود.";
  }

  if (code.includes("ReferencedByOtherEntities") || code.includes("Deletion.YouCannotDelete")) {
    return "لا يمكن الحذف لأن العنصر مرتبط ببيانات أخرى.";
  }

  const detail = envelope.detail ?? envelope.Detail;
  const fromDetail = friendlyFromText(detail);
  if (fromDetail) return fromDetail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  const title = envelope.title ?? envelope.Title;
  const fromTitle = friendlyFromText(title);
  if (fromTitle) return fromTitle;
  if (typeof title === "string" && title.trim() && title !== "Bad Request") {
    return title;
  }

  const fromMessage =
    friendlyFromText(envelope.message) || friendlyFromText(envelope.Message);
  if (fromMessage) return fromMessage;

  if (typeof envelope.message === "string" && envelope.message.trim()) {
    return envelope.message;
  }

  if (typeof envelope.Message === "string" && envelope.Message.trim()) {
    return envelope.Message;
  }

  if (code) {
    return humanizeErrorCode(code);
  }

  return fallback;
};

export const extractApiErrorCode = (payload: unknown) => {
  const envelope = parseErrorPayload(payload);
  if (!envelope) return "";
  return String(envelope.code ?? envelope.Code ?? "").trim();
};

const RAW_API_KEYS = [
  "success",
  "Success",
  "code",
  "Code",
  "message",
  "Message",
  "detail",
  "Detail",
  "title",
  "Title",
  "errors",
  "Errors",
] as const;

/** Original error body from the API, before any Arabic mapping. */
export const extractApiRawText = (payload: unknown): string => {
  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (!trimmed || looksLikeMarkup(trimmed)) return "";
    return trimmed.slice(0, 4000);
  }

  const envelope = parseErrorPayload(payload);
  if (!envelope) return "";

  const slice: Record<string, unknown> = {};
  for (const key of RAW_API_KEYS) {
    if (envelope[key] != null && envelope[key] !== "") {
      slice[key] = envelope[key];
    }
  }

  const source = Object.keys(slice).length ? slice : envelope;
  try {
    return JSON.stringify(source, null, 2).slice(0, 4000);
  } catch {
    return extractApiErrorCode(payload);
  }
};

export const getThrownRawApiText = (err: unknown) => {
  if (err && typeof err === "object" && "rawApi" in err) {
    const rawApi = (err as { rawApi?: unknown }).rawApi;
    if (typeof rawApi === "string" && rawApi.trim()) return rawApi.trim();
  }
  return "";
};

export const getThrownApiDisplay = (err: unknown, fallback = "فشل تنفيذ العملية.") =>
  getThrownErrorMessage(err, fallback);

export const getThrownErrorMessage = (err: unknown, fallback = "فشل تنفيذ العملية.") => {
  const raw =
    err instanceof Error
      ? err.message
      : err && typeof err === "object" && "message" in err
        ? (err as { message?: unknown }).message
        : undefined;

  if (typeof raw !== "string" || !raw.trim()) return fallback;
  if (looksLikeMarkup(raw)) return API_UNAVAILABLE_MESSAGE;
  return friendlyFromText(raw) || raw;
};

export const getThrownErrorCode = (err: unknown) => {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === "string") return code.trim();
  }
  return "";
};

/** Confirm-email CTA — not for AccountInactive (email confirmed, account still disabled). */
export const needsEmailConfirmationCta = (code: string, message = "") => {
  const normalized = code.toLowerCase();
  if (normalized.includes("accountinactive")) return false;
  if (normalized.includes("emailnotverified") || normalized.includes("otp.error.activation")) {
    return true;
  }
  return (
    message.includes("راجع بريدك") ||
    message.includes("أكّد بريدك") ||
    message.toLowerCase().includes("not verified")
  );
};

export type PagedResult<T> = {
  page?: T[];
  currentPage?: number | string;
  hasMore?: boolean;
  totalItems?: number | string;
};

export const unwrapData = <T>(payload: unknown): T | null => {
  if (!payload || typeof payload !== "object") return null;
  const envelope = payload as ApiEnvelope<T>;
  return (envelope.data ?? envelope.Data ?? null) as T | null;
};

export const unwrapPage = <T>(payload: unknown): T[] => {
  const data = unwrapData<unknown>(payload);
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];
  if (typeof data !== "object") return [];

  const obj = data as Record<string, unknown>;
  const page =
    obj.page ?? obj.Page ?? obj.items ?? obj.Items ?? obj.records ?? obj.Records;
  return Array.isArray(page) ? (page as T[]) : [];
};

export const unwrapPagedMeta = (payload: unknown) => {
  const data = unwrapData<Record<string, unknown>>(payload);
  const totalItems = Number(data?.totalItems ?? data?.TotalItems ?? 0);
  const currentPage = Number(data?.currentPage ?? data?.CurrentPage ?? 1);
  const hasMore = Boolean(data?.hasMore ?? data?.HasMore);

  return {
    totalItems,
    currentPage,
    hasMore,
    totalPages: hasMore ? currentPage + 1 : currentPage || 1,
  };
};

export const assertSuccess = (payload: unknown) => {
  if (!payload || typeof payload !== "object") return;
  const envelope = payload as ApiEnvelope<unknown>;
  const success = envelope.success ?? envelope.Success;

  if (success === false) {
    throw {
      message: formatApiErrorMessage(payload),
      code: extractApiErrorCode(payload),
      rawApi: extractApiRawText(payload),
    };
  }
};

const normalizeApiPayload = (payload: unknown): unknown => {
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload) as unknown;
    } catch {
      return payload;
    }
  }

  return payload;
};

export const assertMutationSuccess = (
  payload: unknown,
  fallback = "فشل تنفيذ العملية.",
) => {
  const normalized = normalizeApiPayload(payload);

  if (!normalized || typeof normalized !== "object") {
    throw { message: fallback };
  }

  const envelope = normalized as ApiEnvelope<unknown>;
  const success = envelope.success ?? envelope.Success;

  if (success !== true) {
    throw {
      message: formatApiErrorMessage(payload, fallback),
      code: extractApiErrorCode(payload),
      rawApi: extractApiRawText(payload),
    };
  }
};

export const unwrapEntity = <T>(payload: unknown): T => {
  assertSuccess(payload);
  const data = unwrapData<T>(payload);
  if (!data) {
    throw { message: "الاستجابة لا تحتوي على بيانات." };
  }
  return data;
};

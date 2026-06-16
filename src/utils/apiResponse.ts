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
  "SkillType.Error.Name.Duplicate": "اسم نوع المهارة موجود مسبقاً.",
  "ContractType.Error.Name.Duplicate": "اسم نوع العقد موجود مسبقاً.",
  "Department.Error.Name.Duplicate": "اسم القسم موجود مسبقاً.",
  "WorkingSchedule.Error.Name.Duplicate": "اسم جدول العمل موجود مسبقاً.",
  "WorkingSchedule.Error.InvalidPeriod": "فترة العمل غير صالحة. تأكد من الأوقات والأيام.",
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
    "معرّف موظف مرجعي غير موجود (غالباً مدير القسم). عيّن مديراً نشطاً للقسم ثم أعد المحاولة.",
  "Global.Error.InternalServerError": "خطأ داخلي في السيرفر. تحقق من البيانات أو جرّب بريداً مختلفاً.",
  "Global.Error.Deletion.YouCannotDeleteThisEntityBecauseItIsReferencedByOtherEntities":
    "لا يمكن الحذف لأن هذا القسم مرتبط بأقسام فرعية أو بيانات أخرى.",
};

const humanizeErrorCode = (code: string) => {
  if (code.includes("Email") && (code.includes("Duplicate") || code.includes("Exists"))) {
    return "البريد الإلكتروني مستخدم مسبقاً. قد يكون لموظف موجود أو مؤرشف — استخدم بريداً مختلفاً.";
  }
  if (code.includes("Manager")) {
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
  if (code.includes("Password")) {
    return "كلمة المرور لا تستوفي متطلبات النظام.";
  }
  if (code.includes("Internal") || code.includes("Server")) {
    return "خطأ داخلي في السيرفر. تحقق من اكتمال البيانات.";
  }
  return `خطأ من السيرفر: ${code}`;
};

const parseErrorPayload = (payload: unknown): Record<string, unknown> | null => {
  if (!payload) return null;
  if (typeof payload === "string") {
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

  if (code && API_ERROR_MESSAGES[code]) {
    return API_ERROR_MESSAGES[code];
  }

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
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  const title = envelope.title ?? envelope.Title;
  if (typeof title === "string" && title.trim() && title !== "Bad Request") {
    return title;
  }

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

export const getThrownErrorMessage = (err: unknown, fallback = "فشل تنفيذ العملية.") => {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
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
  const data = unwrapData<PagedResult<T>>(payload);
  if (!data) return [];
  return Array.isArray(data.page) ? data.page : [];
};

export const unwrapPagedMeta = (payload: unknown) => {
  const data = unwrapData<PagedResult<unknown>>(payload);
  const totalItems = Number(data?.totalItems ?? 0);
  const currentPage = Number(data?.currentPage ?? 1);
  const hasMore = Boolean(data?.hasMore);

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
    };
  }
};

export const assertMutationSuccess = (
  payload: unknown,
  fallback = "فشل تنفيذ العملية.",
) => {
  if (!payload || typeof payload !== "object") {
    throw { message: fallback };
  }

  const envelope = payload as ApiEnvelope<unknown>;
  const success = envelope.success ?? envelope.Success;

  if (success !== true) {
    throw {
      message: formatApiErrorMessage(payload, fallback),
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

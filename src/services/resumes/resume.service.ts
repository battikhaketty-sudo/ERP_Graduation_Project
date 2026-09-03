import api from "../api";
import type { EmployeeResumeLine, EmployeeResumeSkill } from "../../types/employee";
import {
  assertSuccess,
  unwrapData,
  unwrapEntity,
} from "../../utils/apiResponse";
import { RESUME_LINE_TYPE_BY_API, ResumeLineTypeApi } from "../backendEnums";

export type ResumeLineTypeOption = {
  id: number;
  name: string;
};

export type ResumeLinePayload = {
  title: string;
  type: number;
  fromDate: string;
  toDate?: string | null;
  description?: string | null;
};

export type ResumeSkillPayload = {
  skillId: string;
  skillLevelId: string;
};

const toIsoOrNull = (value?: string | null) => {
  if (!value?.trim()) return null;
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const normalizeLineType = (item: Record<string, unknown>): ResumeLineTypeOption => ({
  id: Number(item.id ?? item.value ?? 0),
  name: String(item.name ?? item.label ?? ""),
});

export const getResumeLineTypes = async (): Promise<ResumeLineTypeOption[]> => {
  const response = await api.get("/constants/resume-line-types");
  const payload = response.data;
  const data =
    unwrapData<Record<string, unknown>[]>(payload) ??
    (Array.isArray(payload) ? (payload as Record<string, unknown>[]) : null);
  if (!Array.isArray(data) || data.length === 0) {
    return [
      { id: ResumeLineTypeApi.Education, name: RESUME_LINE_TYPE_BY_API[ResumeLineTypeApi.Education] },
      { id: ResumeLineTypeApi.Training, name: RESUME_LINE_TYPE_BY_API[ResumeLineTypeApi.Training] },
      { id: ResumeLineTypeApi.Experience, name: RESUME_LINE_TYPE_BY_API[ResumeLineTypeApi.Experience] },
      { id: ResumeLineTypeApi.Certificate, name: RESUME_LINE_TYPE_BY_API[ResumeLineTypeApi.Certificate] },
      { id: ResumeLineTypeApi.Other, name: RESUME_LINE_TYPE_BY_API[ResumeLineTypeApi.Other] },
    ];
  }
  return data.map((item) => normalizeLineType(item)).filter((item) => item.id > 0);
};

export const getResumeById = async (resumeId: string) => {
  const response = await api.get(`/resumes/${resumeId}`);
  return unwrapEntity<Record<string, unknown>>(response.data);
};

export const addResumeLine = async (resumeId: string, payload: ResumeLinePayload) => {
  const response = await api.post(`/resumes/${resumeId}/lines`, {
    title: payload.title.trim(),
    type: payload.type,
    fromDate: toIsoOrNull(payload.fromDate),
    toDate: toIsoOrNull(payload.toDate),
    description: payload.description?.trim() || null,
  });
  assertSuccess(response.data);
  return unwrapData<string>(response.data);
};

export const updateResumeLine = async (
  resumeId: string,
  lineId: string,
  payload: ResumeLinePayload,
) => {
  const response = await api.put(`/resumes/${resumeId}/lines/${lineId}`, {
    title: payload.title.trim(),
    type: payload.type,
    fromDate: toIsoOrNull(payload.fromDate),
    toDate: toIsoOrNull(payload.toDate),
    description: payload.description?.trim() || null,
  });
  assertSuccess(response.data);
};

export const deleteResumeLine = async (resumeId: string, lineId: string) => {
  const response = await api.delete(`/resumes/${resumeId}/lines/${lineId}`);
  assertSuccess(response.data);
};

export const addResumeSkill = async (resumeId: string, payload: ResumeSkillPayload) => {
  const response = await api.post(`/resumes/${resumeId}/skills`, {
    skillId: payload.skillId,
    skillLevelId: payload.skillLevelId,
  });
  assertSuccess(response.data);
  return unwrapData<string>(response.data);
};

export const updateResumeSkill = async (
  resumeId: string,
  resumeSkillId: string,
  payload: ResumeSkillPayload,
) => {
  const response = await api.put(`/resumes/${resumeId}/skills/${resumeSkillId}`, {
    skillId: payload.skillId,
    skillLevelId: payload.skillLevelId,
  });
  assertSuccess(response.data);
};

export const deleteResumeSkill = async (resumeId: string, resumeSkillId: string) => {
  const response = await api.delete(
    `/resumes/${resumeId}/skills/${resumeSkillId}`,
  );
  assertSuccess(response.data);
};

const isLocalId = (id?: string) => !id || id.startsWith("local-");

const lineFingerprint = (line: EmployeeResumeLine) =>
  [
    line.title.trim(),
    String(line.type ?? ""),
    line.typeName.trim(),
    line.fromDate || "",
    line.toDate || "",
    (line.description || "").trim(),
  ].join("|");

const skillFingerprint = (skill: EmployeeResumeSkill) =>
  [skill.skillId, skill.skillLevelId, skill.name, skill.level].join("|");

/** Diff baseline vs draft and apply via dedicated Resume APIs (JSON). */
export const syncEmployeeResume = async (
  resumeId: string,
  baseline: {
    lines: EmployeeResumeLine[];
    skills: EmployeeResumeSkill[];
  },
  draft: {
    lines: EmployeeResumeLine[];
    skills: EmployeeResumeSkill[];
  },
) => {
  const draftLineIds = new Set(
    draft.lines.map((line) => line.id).filter((id) => !isLocalId(id)),
  );
  const draftSkillIds = new Set(
    draft.skills
      .map((skill) => skill.id)
      .filter((id): id is string => Boolean(id) && !isLocalId(id)),
  );

  for (const line of baseline.lines) {
    if (!isLocalId(line.id) && !draftLineIds.has(line.id)) {
      await deleteResumeLine(resumeId, line.id);
    }
  }

  for (const line of draft.lines) {
    if (!line.title.trim() || !line.type || !line.fromDate) continue;
    const payload: ResumeLinePayload = {
      title: line.title,
      type: line.type,
      fromDate: line.fromDate,
      toDate: line.toDate || null,
      description: line.description || null,
    };
    if (isLocalId(line.id)) {
      await addResumeLine(resumeId, payload);
      continue;
    }
    const original = baseline.lines.find((entry) => entry.id === line.id);
    if (!original || lineFingerprint(original) !== lineFingerprint(line)) {
      await updateResumeLine(resumeId, line.id, payload);
    }
  }

  for (const skill of baseline.skills) {
    if (skill.id && !isLocalId(skill.id) && !draftSkillIds.has(skill.id)) {
      await deleteResumeSkill(resumeId, skill.id);
    }
  }

  for (const skill of draft.skills) {
    if (!skill.skillId || !skill.skillLevelId) continue;
    const payload: ResumeSkillPayload = {
      skillId: skill.skillId,
      skillLevelId: skill.skillLevelId,
    };
    if (!skill.id || isLocalId(skill.id)) {
      await addResumeSkill(resumeId, payload);
      continue;
    }
    const original = baseline.skills.find((entry) => entry.id === skill.id);
    if (!original || skillFingerprint(original) !== skillFingerprint(skill)) {
      await updateResumeSkill(resumeId, skill.id, payload);
    }
  }
};

export {
  getResumeLineTypes,
  getResumeById,
  addResumeLine,
  updateResumeLine,
  deleteResumeLine,
  addResumeSkill,
  updateResumeSkill,
  deleteResumeSkill,
  syncEmployeeResume,
} from "./resume.service";

export type {
  ResumeLineTypeOption,
  ResumeLinePayload,
  ResumeSkillPayload,
} from "./resume.service";

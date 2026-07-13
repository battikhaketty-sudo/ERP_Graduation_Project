export type EmployeeSkillRow = {
  typeId: string;
  type: string;
  skillId: string;
  name: string;
  levelId: string;
  level: string;
};

export const emptyEmployeeSkillRow = (): EmployeeSkillRow => ({
  typeId: "",
  type: "",
  skillId: "",
  name: "",
  levelId: "",
  level: "",
});

export const isEmployeeSkillRowComplete = (row: EmployeeSkillRow) =>
  Boolean(row.typeId && row.skillId && row.levelId);

export const toResumeSkillPayload = (row: EmployeeSkillRow) => ({
  name: row.name,
  type: row.type,
  level: row.level,
});

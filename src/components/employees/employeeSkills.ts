export type EmployeeSkillRow = {
  /** Existing resume-skill id when editing a saved row. */
  resumeSkillId?: string;
  typeId: string;
  type: string;
  skillId: string;
  name: string;
  levelId: string;
  level: string;
};

export const emptyEmployeeSkillRow = (): EmployeeSkillRow => ({
  resumeSkillId: undefined,
  typeId: "",
  type: "",
  skillId: "",
  name: "",
  levelId: "",
  level: "",
});

export const isEmployeeSkillRowComplete = (row: EmployeeSkillRow) =>
  Boolean(row.skillId && row.levelId && (row.typeId || row.name));

export const toResumeSkillPayload = (row: EmployeeSkillRow) => ({
  id: row.resumeSkillId,
  skillId: row.skillId,
  skillLevelId: row.levelId,
  name: row.name,
  type: row.type,
  level: row.level,
});

export const resumeSkillsToRows = (
  skills: Array<{
    id?: string;
    skillId?: string;
    skillLevelId?: string;
    name: string;
    type: string;
    level: string;
  }>,
  skillGroups: Array<{
    id: string;
    name: string;
    skills: Array<{ id?: string; name: string }>;
    levels: Array<{ id?: string; name: string }>;
  }>,
): EmployeeSkillRow[] => {
  if (!skills.length) return [emptyEmployeeSkillRow()];

  return skills.map((skill) => {
    const group =
      skillGroups.find((entry) =>
        entry.skills.some(
          (item) =>
            (item.id && item.id === skill.skillId) ||
            item.name === skill.skillId ||
            (skill.name && item.name === skill.name),
        ),
      ) ??
      skillGroups.find((entry) => entry.name === skill.type);

    const matchedSkill = group?.skills.find(
      (item) =>
        (item.id && item.id === skill.skillId) ||
        item.name === skill.skillId ||
        (skill.name && item.name === skill.name),
    );

    const levelId =
      skill.skillLevelId ||
      group?.levels.find((level) => level.name === skill.level)?.id ||
      "";

    return {
      resumeSkillId: skill.id,
      typeId: group?.id ?? "",
      type: group?.name ?? skill.type,
      skillId: matchedSkill?.id || skill.skillId || "",
      name: matchedSkill?.name || skill.name,
      levelId,
      level: skill.level,
    };
  });
};

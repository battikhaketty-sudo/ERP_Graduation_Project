export type Skill = {
  id?: string;
  name: string;
};

export type SkillLevel = {
  id?: string;
  name: string;
  progress: number;
};

export type SkillGroup = {
  id: string;
  name: string;
  skills: Skill[];
  levels: SkillLevel[];
};

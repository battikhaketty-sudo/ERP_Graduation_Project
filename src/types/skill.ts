export type SkillLevel = {
  id?: string;
  name: string;
  progress: number;
};

export type SkillGroup = {
  id: string;
  name: string;
  skills: string[];
  levels: SkillLevel[];
};

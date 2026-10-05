export type ID = string;
export type Status = 'not_started' | 'learning' | 'revised' | 'mastered';
export interface Exam { id: ID; name: string; date?: string; dailyHours: number; createdAt: number }
export interface Category { id: ID; name: string; color: string; order: number }
export interface Subject { id: ID; examId: ID; categoryId: ID; name: string; kind: 'theory' | 'practical' | 'both'; difficulty: 1|2|3|4|5; marks: number; examDate?: string }
export interface Chapter { id: ID; subjectId: ID; title: string; marks: number; priority: 1|2|3; order: number }
export interface Topic { id: ID; chapterId: ID; title: string; status: Status; confidence: 1|2|3|4|5; revisions: number; lastStudied?: number; notes: string; important: boolean; order: number; plannedDate?: string }
export interface Subtopic { id: ID; topicId: ID; title: string; done: boolean }
export interface Block { id: ID; date: string; start: string; durationMin: number; topicIds: ID[]; title: string; status: 'planned'|'done'|'skipped'|'missed'|'snoozed'; skipReason?: string; snoozes: number; kind: 'study'|'revision'|'daily' }
export interface FocusSession { id: ID; blockId?: ID; startedAt: number; minutes: number }
export interface KV { key: string; value: unknown }

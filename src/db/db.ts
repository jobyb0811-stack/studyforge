import Dexie, { type Table } from 'dexie';
import type * as T from './types';
export class StudyDB extends Dexie {
  exams!: Table<T.Exam, string>; categories!: Table<T.Category, string>; subjects!: Table<T.Subject, string>;
  chapters!: Table<T.Chapter, string>; topics!: Table<T.Topic, string>; subtopics!: Table<T.Subtopic, string>;
  blocks!: Table<T.Block, string>; sessions!: Table<T.FocusSession, string>; kv!: Table<T.KV, string>;
  constructor(name = 'studyforge') {
    super(name);
    this.version(1).stores({
      exams: 'id', categories: 'id,order', subjects: 'id,examId,categoryId', chapters: 'id,subjectId',
      topics: 'id,chapterId,status,plannedDate,confidence', subtopics: 'id,topicId',
      blocks: 'id,date,status', sessions: 'id,startedAt', kv: 'key',
    });
  }
}
export const db = new StudyDB();

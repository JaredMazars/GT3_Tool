/**
 * Caching service for questionnaire structures
 * Questionnaire definitions don't change often, so we cache them in memory
 */

import { QuestionnaireType, getQuestionnaireDefinition, QuestionSection } from '@/constants/acceptance-questions';

const structureCache = new Map<QuestionnaireType, QuestionSection[]>();

/**
 * Get questionnaire structure with caching
 * Significantly improves performance by avoiding repeated structure generation
 */
export function getCachedQuestionnaireStructure(type: QuestionnaireType): QuestionSection[] {
  if (!structureCache.has(type)) {
    const structure = getQuestionnaireDefinition(type);
    structureCache.set(type, structure);
  }
  return structureCache.get(type)!;
}

/**
 * Clear cache for a specific questionnaire type
 * Use when questionnaire definitions are updated
 */
export function clearQuestionnaireCache(type?: QuestionnaireType): void {
  if (type) {
    structureCache.delete(type);
  } else {
    structureCache.clear();
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    cachedTypes: Array.from(structureCache.keys()),
    cacheSize: structureCache.size,
  };
}






















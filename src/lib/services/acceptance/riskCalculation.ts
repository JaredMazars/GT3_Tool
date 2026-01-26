/**
 * Risk Calculation and Assessment Logic
 * Calculates risk scores based on questionnaire answers
 */

import { AcceptanceQuestionDef } from '@/constants/acceptance-questions';

export type RiskRating = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RiskAssessment {
  overallRiskScore: number; // 0-100 percentage
  riskRating: RiskRating;
  riskSummary: string;
  sectionRisks: SectionRisk[];
  highRiskQuestions: HighRiskQuestion[];
}

export interface SectionRisk {
  sectionKey: string;
  sectionTitle: string;
  riskScore: number; // 0-100
  riskRating: RiskRating;
  questionCount: number;
  highRiskCount: number;
}

export interface HighRiskQuestion {
  questionKey: string;
  questionText: string;
  answer: string;
  riskWeight: number;
  sectionKey: string;
}

export interface Answer {
  questionKey: string;
  answer: string;
  comment?: string;
}

/**
 * Calculate overall risk assessment from questionnaire answers
 */
export function calculateRiskAssessment(
  questions: AcceptanceQuestionDef[],
  answers: Answer[]
): RiskAssessment {
  // Create answer lookup map
  const answerMap = new Map(answers.map((a) => [a.questionKey, a]));

  // Calculate risk score for each question
  const questionRisks: Array<{
    question: AcceptanceQuestionDef;
    answer: Answer | undefined;
    isHighRisk: boolean;
    contributedRisk: number;
  }> = [];

  let totalPossibleRisk = 0;
  let totalActualRisk = 0;

  for (const question of questions) {
    // Skip non-scored questions (placeholders, buttons, etc.)
    if (question.fieldType === 'PLACEHOLDER' || question.fieldType === 'BUTTON' || question.riskWeight === 0) {
      continue;
    }

    const answer = answerMap.get(question.questionKey);
    totalPossibleRisk += question.riskWeight;

    // Check if this answer is high risk
    const isHighRisk = checkIfHighRisk(question, answer?.answer);
    const contributedRisk = isHighRisk ? question.riskWeight : 0;

    questionRisks.push({
      question,
      answer,
      isHighRisk,
      contributedRisk,
    });

    totalActualRisk += contributedRisk;
  }

  // Calculate overall risk score (0-100)
  const overallRiskScore = totalPossibleRisk > 0 
    ? Math.round((totalActualRisk / totalPossibleRisk) * 100) 
    : 0;

  // Determine risk rating
  const riskRating = getRiskRating(overallRiskScore);

  // Calculate section-level risks
  const sectionRisks = calculateSectionRisks(questions, answers);

  // Identify high-risk questions
  const highRiskQuestions: HighRiskQuestion[] = questionRisks
    .filter((qr) => qr.isHighRisk && qr.answer)
    .map((qr) => ({
      questionKey: qr.question.questionKey,
      questionText: qr.question.questionText,
      answer: qr.answer!.answer,
      riskWeight: qr.question.riskWeight,
      sectionKey: qr.question.sectionKey,
    }));

  // Generate risk summary
  const riskSummary = generateRiskSummary(
    riskRating,
    overallRiskScore,
    highRiskQuestions.length,
    sectionRisks
  );

  return {
    overallRiskScore,
    riskRating,
    riskSummary,
    sectionRisks,
    highRiskQuestions,
  };
}

/**
 * Check if an answer to a question indicates high risk
 */
function checkIfHighRisk(question: AcceptanceQuestionDef, answer: string | undefined): boolean {
  if (!answer || !question.highRiskAnswers || question.highRiskAnswers.length === 0) {
    return false;
  }

  // Case-insensitive comparison
  const normalizedAnswer = answer.trim().toLowerCase();
  return question.highRiskAnswers.some(
    (riskAnswer) => riskAnswer.toLowerCase() === normalizedAnswer
  );
}

/**
 * Convert risk score to risk rating
 */
export function getRiskRating(score: number): RiskRating {
  if (score <= 30) {
    return 'LOW';
  } else if (score <= 60) {
    return 'MEDIUM';
  } else {
    return 'HIGH';
  }
}

/**
 * Calculate risk scores for each section
 */
function calculateSectionRisks(
  questions: AcceptanceQuestionDef[],
  answers: Answer[]
): SectionRisk[] {
  const answerMap = new Map(answers.map((a) => [a.questionKey, a]));

  // Group questions by section
  const sectionMap = new Map<string, AcceptanceQuestionDef[]>();
  for (const question of questions) {
    if (question.riskWeight === 0) continue; // Skip non-scored questions

    if (!sectionMap.has(question.sectionKey)) {
      sectionMap.set(question.sectionKey, []);
    }
    sectionMap.get(question.sectionKey)!.push(question);
  }

  // Calculate risk for each section
  const sectionRisks: SectionRisk[] = [];

  for (const [sectionKey, sectionQuestions] of sectionMap.entries()) {
    let totalPossibleRisk = 0;
    let totalActualRisk = 0;
    let highRiskCount = 0;

    for (const question of sectionQuestions) {
      totalPossibleRisk += question.riskWeight;

      const answer = answerMap.get(question.questionKey);
      const isHighRisk = checkIfHighRisk(question, answer?.answer);

      if (isHighRisk) {
        totalActualRisk += question.riskWeight;
        highRiskCount++;
      }
    }

    const riskScore = totalPossibleRisk > 0 
      ? Math.round((totalActualRisk / totalPossibleRisk) * 100) 
      : 0;

    sectionRisks.push({
      sectionKey,
      sectionTitle: getSectionTitle(sectionKey),
      riskScore,
      riskRating: getRiskRating(riskScore),
      questionCount: sectionQuestions.length,
      highRiskCount,
    });
  }

  return sectionRisks.sort((a, b) => b.riskScore - a.riskScore); // Sort by risk score descending
}

/**
 * Get human-readable section title from section key
 */
function getSectionTitle(sectionKey: string): string {
  const titles: Record<string, string> = {
    independence: 'Independence and Other Considerations',
    continuance_independence: 'Independence and Other Considerations',
    ac_lite_money_laundering: 'Money Laundering and Terrorist Financing',
    ac_lite_independence: 'Independence',
    ac_lite_kyc: 'Know Your Client (KYC)',
    ac_lite_part_a: 'Part A - Major Risk Factors',
    ac_lite_part_b: 'Part B - Normal Risk Factors',
    ac_lite_criteria: 'AC Lite Eligibility Criteria',
  };

  return titles[sectionKey] || sectionKey;
}

/**
 * Generate a human-readable risk summary
 */
function generateRiskSummary(
  riskRating: RiskRating,
  overallRiskScore: number,
  highRiskQuestionCount: number,
  sectionRisks: SectionRisk[]
): string {
  const lines: string[] = [];

  // Overall assessment
  lines.push(`Overall Risk Rating: ${riskRating} (${overallRiskScore}%)`);
  lines.push('');

  if (riskRating === 'LOW') {
    lines.push('This engagement presents a low risk profile. Standard acceptance procedures and safeguards should be sufficient.');
  } else if (riskRating === 'MEDIUM') {
    lines.push('This engagement presents a medium risk profile. Enhanced safeguards and procedures are recommended.');
  } else {
    lines.push('This engagement presents a high risk profile. Comprehensive safeguards, senior review, and risk management approval are required.');
  }

  lines.push('');

  // High-risk questions summary
  if (highRiskQuestionCount > 0) {
    lines.push(`**Risk Factors Identified:** ${highRiskQuestionCount} high-risk indicator${highRiskQuestionCount > 1 ? 's' : ''} detected.`);
    lines.push('');
  }

  // Section-level summary
  const highRiskSections = sectionRisks.filter((s) => s.riskRating === 'HIGH');
  const mediumRiskSections = sectionRisks.filter((s) => s.riskRating === 'MEDIUM');

  if (highRiskSections.length > 0) {
    lines.push('**High Risk Areas:**');
    for (const section of highRiskSections) {
      lines.push(`- ${section.sectionTitle}: ${section.highRiskCount} of ${section.questionCount} questions indicate high risk`);
    }
    lines.push('');
  }

  if (mediumRiskSections.length > 0) {
    lines.push('**Medium Risk Areas:**');
    for (const section of mediumRiskSections) {
      lines.push(`- ${section.sectionTitle}: ${section.highRiskCount} of ${section.questionCount} questions indicate risk`);
    }
    lines.push('');
  }

  // Recommendations
  lines.push('**Recommendations:**');
  
  if (riskRating === 'HIGH') {
    lines.push('- Obtain Risk Management Committee approval before proceeding');
    lines.push('- Implement enhanced safeguards and additional procedures');
    lines.push('- Assign experienced senior staff and ensure adequate resources');
    lines.push('- Consider Engagement Quality Review (EQR) requirements');
    lines.push('- Document all safeguards and risk mitigation measures');
  } else if (riskRating === 'MEDIUM') {
    lines.push('- Review and document appropriate safeguards for each risk area');
    lines.push('- Consider enhanced quality control procedures');
    lines.push('- Ensure adequate staffing and resources');
    lines.push('- Partner/senior management review recommended');
  } else {
    lines.push('- Apply standard acceptance and quality control procedures');
    lines.push('- Ensure compliance with firm policies and professional standards');
    lines.push('- Document acceptance decision and any relevant considerations');
  }

  return lines.join('\n');
}

/**
 * Validate that all required questions have been answered
 */
export function validateRequiredQuestions(
  questions: AcceptanceQuestionDef[],
  answers: Answer[]
): { isValid: boolean; missingQuestions: string[] } {
  const answerMap = new Map(answers.map((a) => [a.questionKey, a]));
  const missingQuestions: string[] = [];

  for (const question of questions) {
    // Skip non-required questions
    if (!question.required) continue;

    // Skip placeholder and button fields
    if (question.fieldType === 'PLACEHOLDER' || question.fieldType === 'BUTTON') continue;

    // Check for conditional display
    if (question.conditionalDisplay) {
      const dependentAnswer = answerMap.get(question.conditionalDisplay.dependsOn);
      // If condition not met, skip validation
      if (dependentAnswer?.answer !== question.conditionalDisplay.requiredAnswer) {
        continue;
      }
    }

    // Check if answer exists and is not empty
    const answer = answerMap.get(question.questionKey);
    if (!answer || !answer.answer || answer.answer.trim() === '') {
      missingQuestions.push(question.questionKey);
    }
  }

  return {
    isValid: missingQuestions.length === 0,
    missingQuestions,
  };
}

/**
 * Calculate completion percentage
 * Accounts for conditional questions by only including questions that should be visible
 */
export function calculateCompletionPercentage(
  questions: AcceptanceQuestionDef[],
  answers: Answer[]
): number {
  const answerableQuestions = questions.filter(
    (q) => q.required && q.fieldType !== 'PLACEHOLDER' && q.fieldType !== 'BUTTON'
  );

  if (answerableQuestions.length === 0) return 100;

  const answerMap = new Map(answers.map((a) => [a.questionKey, a]));
  let answeredCount = 0;
  let visibleQuestionCount = 0;

  for (const question of answerableQuestions) {
    // Check for conditional display
    if (question.conditionalDisplay) {
      const dependentAnswer = answerMap.get(question.conditionalDisplay.dependsOn);
      if (dependentAnswer?.answer !== question.conditionalDisplay.requiredAnswer) {
        continue; // Don't count conditional questions that shouldn't be shown
      }
    }

    // This question is visible and should be counted
    visibleQuestionCount++;

    const answer = answerMap.get(question.questionKey);
    if (answer && answer.answer && answer.answer.trim() !== '') {
      answeredCount++;
    }
  }

  // Prevent division by zero if no questions are visible (edge case)
  if (visibleQuestionCount === 0) return 100;

  return Math.round((answeredCount / visibleQuestionCount) * 100);
}




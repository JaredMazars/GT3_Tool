import { generateObject, generateText } from 'ai';
import { models, getModelParams } from '@/lib/ai/config';
import { FinancialRatioCalculator, FinancialData } from './financialRatioCalculator';
import { CreditAnalysisReport, CreditRatingGrade, FinancialRatios } from '@/types/analytics';
import { logger } from '@/lib/utils/logger';
import { formatAmount } from '@/lib/utils/formatters';
import { z } from 'zod';

interface ClientInfo {
  id: number;
  name: string;
  industry?: string;
  sector?: string;
}

interface DocumentInfo {
  id: number;
  fileName: string;
  documentType: string;
  extractedData?: any;
}

export interface CreditRatingResult {
  ratingGrade: CreditRatingGrade;
  ratingScore: number; // 0-100
  analysisReport: CreditAnalysisReport;
  financialRatios: FinancialRatios;
  confidence: number; // 0-1
}

/**
 * Credit Rating Analyzer
 * Uses AI to analyze financial documents and generate comprehensive credit ratings
 */
export class CreditRatingAnalyzer {
  /**
   * Analyze documents and generate credit rating
   */
  static async analyzeCreditRating(
    client: ClientInfo,
    documents: DocumentInfo[]
  ): Promise<CreditRatingResult> {
    logger.info('Starting credit rating analysis', {
      GSClientID: client.id,
      clientName: client.name,
      documentCount: documents.length,
    });

    try {
      // Step 1: Extract and combine financial data from all documents
      const financialData = this.combineFinancialData(documents);
      logger.info('Financial data extracted', {
        GSClientID: client.id,
        dataPoints: Object.keys(financialData).filter(k => financialData[k as keyof typeof financialData] !== undefined).length,
      });

      // Step 2: Calculate financial ratios
      const financialRatios = FinancialRatioCalculator.calculateRatios(financialData);
      const calculatedRatios = Object.keys(financialRatios).filter(k => financialRatios[k as keyof typeof financialRatios] !== undefined);
      logger.info('Financial ratios calculated', {
        GSClientID: client.id,
        ratiosCalculated: calculatedRatios.length,
        ratios: calculatedRatios,
      });

      // Step 3: Build comprehensive prompt for AI analysis
      const prompt = this.buildAnalysisPrompt(client, documents, financialData, financialRatios);

      // Step 4: Generate AI analysis
      const analysisReport = await this.generateAIAnalysis(prompt, financialRatios);
      logger.info('AI analysis generated', {
        GSClientID: client.id,
        hasExecutiveSummary: !!analysisReport.executiveSummary,
        strengthsCount: analysisReport.strengths.length,
        weaknessesCount: analysisReport.weaknesses.length,
        riskFactorsCount: analysisReport.riskFactors.length,
        recommendationsCount: analysisReport.recommendations.length,
        hasIndustryComparison: !!analysisReport.industryComparison,
      });

      // Step 5: Calculate rating score and grade
      const { ratingScore, ratingGrade, confidence } = this.calculateRating(
        financialRatios,
        analysisReport
      );

      logger.info('Credit rating calculation completed', {
        GSClientID: client.id,
        ratingGrade,
        ratingScore,
        confidence,
      });

      // Verify we have all required data before returning
      if (!analysisReport || !financialRatios) {
        logger.error('Missing critical data in credit rating result', {
          GSClientID: client.id,
          hasAnalysisReport: !!analysisReport,
          hasFinancialRatios: !!financialRatios,
        });
        throw new Error('Failed to generate complete credit rating analysis');
      }

      return {
        ratingGrade,
        ratingScore,
        analysisReport,
        financialRatios,
        confidence,
      };
    } catch (error) {
      logger.error('Error analyzing credit rating', { error, GSClientID: client.id });
      throw error;
    }
  }

  /**
   * Combine financial data from multiple documents
   */
  private static combineFinancialData(documents: DocumentInfo[]): FinancialData {
    const combinedData: FinancialData = {};

    for (const doc of documents) {
      if (doc.extractedData) {
        try {
          const parsed = typeof doc.extractedData === 'string' 
            ? JSON.parse(doc.extractedData) 
            : doc.extractedData;
          
          const docData = FinancialRatioCalculator.extractFinancialData(parsed);
          
          // Merge data - prefer most recent/complete values
          Object.keys(docData).forEach((key) => {
            const value = docData[key as keyof FinancialData];
            if (value !== undefined && value !== null) {
              combinedData[key as keyof FinancialData] = value;
            }
          });
        } catch (error) {
          logger.warn('Failed to extract financial data from document', {
            documentId: doc.id,
            error,
          });
        }
      }
    }

    return combinedData;
  }

  /**
   * Build comprehensive prompt for AI analysis
   */
  private static buildAnalysisPrompt(
    client: ClientInfo,
    documents: DocumentInfo[],
    financialData: FinancialData,
    ratios: FinancialRatios
  ): string {
    const ratiosText = Object.entries(ratios)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `  - ${this.formatRatioName(key)}: ${value}`)
      .join('\n');

    const financialDataText = Object.entries(financialData)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `  - ${this.formatRatioName(key)}: ${this.formatCurrency(value!)}`)
      .join('\n');

    const documentsText = documents
      .map((doc) => `  - ${doc.fileName} (${doc.documentType})`)
      .join('\n');

    return `<task>
You are a senior credit analyst conducting a comprehensive credit assessment for a South African company. 
Analyze the provided financial information and generate a detailed credit rating analysis.
</task>

<company_information>
Company Name: ${client.name}
Industry: ${client.industry || 'Not specified'}
Sector: ${client.sector || 'Not specified'}
</company_information>

<financial_data>
${financialDataText || '  No structured financial data extracted'}
</financial_data>

<calculated_financial_ratios>
${ratiosText || '  No ratios calculated (insufficient data)'}
</calculated_financial_ratios>

<documents_analyzed>
${documentsText}
</documents_analyzed>

<analysis_requirements>
Provide a comprehensive credit analysis covering:

1. EXECUTIVE SUMMARY (2-3 paragraphs)
   - Overall creditworthiness assessment
   - Key financial position highlights
   - Main credit strengths and concerns
   - Recommended credit rating rationale

2. STRENGTHS (list of positive factors)
   - Strong financial metrics and ratios
   - Competitive advantages
   - Positive operational indicators
   - Market position strengths

3. WEAKNESSES (list of concerning factors)
   - Financial vulnerabilities
   - Operational concerns
   - Market challenges
   - Risk areas

4. RISK FACTORS (detailed list with severity)
   For each risk:
   - Factor: Description of the risk
   - Severity: HIGH, MEDIUM, or LOW
   - Impact: Potential impact on creditworthiness
   - Mitigation: Possible mitigation strategies (optional)

5. INDUSTRY COMPARISON (if sufficient data)
   - Industry context
   - Company's position relative to peers
   - Key competitive metrics
   - Industry-specific considerations

6. RECOMMENDATIONS (actionable items)
   - Credit terms recommendations
   - Risk mitigation suggestions
   - Financial improvement areas
   - Monitoring requirements

7. DETAILED ANALYSIS (comprehensive narrative)
   - In-depth assessment of financial position
   - Liquidity analysis
   - Profitability assessment
   - Leverage and solvency evaluation
   - Cash flow considerations
   - Management and operational factors
   - Forward-looking assessment
</analysis_requirements>

<credit_rating_framework>
Consider these factors in your analysis:
- Liquidity: Ability to meet short-term obligations
- Profitability: Earning capacity and margins
- Leverage: Debt levels and capital structure
- Cash Flow: Operating cash generation
- Industry Position: Market standing and competitiveness
- Management Quality: Track record and capability
- Economic Environment: External factors affecting operations

Be objective, thorough, and professional. Acknowledge data limitations if applicable.
</credit_rating_framework>`;
  }

  /**
   * Generate AI analysis using Azure OpenAI
   */
  private static async generateAIAnalysis(
    prompt: string,
    ratios: FinancialRatios
  ): Promise<CreditAnalysisReport> {
    const schema = z.object({
      executiveSummary: z.string().describe('Comprehensive 2-3 paragraph executive summary'),
      strengths: z.array(z.string()).describe('List of credit strengths'),
      weaknesses: z.array(z.string()).describe('List of credit weaknesses'),
      riskFactors: z.array(
        z.object({
          factor: z.string(),
          severity: z.enum(['HIGH', 'MEDIUM', 'LOW']),
          impact: z.string(),
          mitigation: z.string().optional(),
        })
      ),
      industryComparison: z.object({
        industry: z.string(),
        companyPosition: z.string(),
        keyMetrics: z.array(
          z.object({
            metric: z.string(),
            companyValue: z.number(),
            industryAverage: z.number(),
            comparison: z.string(),
          })
        ),
      }).optional(),
      recommendations: z.array(z.string()).describe('Actionable recommendations'),
      detailedAnalysis: z.string().describe('Comprehensive detailed analysis narrative'),
    });

    try {
      const { object } = await generateObject({
        model: models.mini,
        ...getModelParams({ temperature: 0.3 }),
        schema,
        prompt,
      });

      // VALIDATION: Validate the AI response against our schema
      // The generateObject should already validate, but we double-check for safety
      const validated = schema.parse(object);
      return validated as CreditAnalysisReport;
    } catch (error) {
      logger.error('Error generating AI analysis', { error });
      
      // Fallback to basic analysis if AI fails
      return this.generateFallbackAnalysis(ratios);
    }
  }

  /**
   * Calculate rating score and grade based on ratios and AI analysis
   */
  private static calculateRating(
    ratios: FinancialRatios,
    analysis: CreditAnalysisReport
  ): {
    ratingScore: number;
    ratingGrade: CreditRatingGrade;
    confidence: number;
  } {
    let score = 50; // Start at middle
    let dataPoints = 0;
    let confidence = 0.5;

    // Assess each ratio category
    const { liquidityScore, liquidityCount } = this.assessLiquidityRatios(ratios);
    const { profitabilityScore, profitabilityCount } = this.assessProfitabilityRatios(ratios);
    const { leverageScore, leverageCount } = this.assessLeverageRatios(ratios);
    const { efficiencyScore, efficiencyCount } = this.assessEfficiencyRatios(ratios);

    // Combine scores with weights
    const totalCount = liquidityCount + profitabilityCount + leverageCount + efficiencyCount;
    
    if (totalCount > 0) {
      score = (
        liquidityScore * 0.3 +
        profitabilityScore * 0.3 +
        leverageScore * 0.25 +
        efficiencyScore * 0.15
      );
      
      // Adjust confidence based on data completeness
      confidence = Math.min(totalCount / 10, 1); // Ideal: 10+ data points
    }

    // Adjust score based on risk factors
    const highRisks = analysis.riskFactors.filter((r) => r.severity === 'HIGH').length;
    const mediumRisks = analysis.riskFactors.filter((r) => r.severity === 'MEDIUM').length;
    score -= highRisks * 5;
    score -= mediumRisks * 2;

    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));

    // Determine grade
    const ratingGrade = this.scoreToGrade(score);

    return {
      ratingScore: Math.round(score),
      ratingGrade,
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  /**
   * Assess liquidity ratios
   */
  private static assessLiquidityRatios(ratios: FinancialRatios): {
    liquidityScore: number;
    liquidityCount: number;
  } {
    let score = 0;
    let count = 0;

    if (ratios.currentRatio !== undefined) {
      count++;
      if (ratios.currentRatio >= 2) score += 30;
      else if (ratios.currentRatio >= 1.5) score += 25;
      else if (ratios.currentRatio >= 1) score += 20;
      else score += 10;
    }

    if (ratios.quickRatio !== undefined) {
      count++;
      if (ratios.quickRatio >= 1.5) score += 25;
      else if (ratios.quickRatio >= 1) score += 20;
      else if (ratios.quickRatio >= 0.75) score += 15;
      else score += 8;
    }

    if (ratios.cashRatio !== undefined) {
      count++;
      if (ratios.cashRatio >= 1) score += 20;
      else if (ratios.cashRatio >= 0.5) score += 15;
      else score += 10;
    }

    return {
      liquidityScore: count > 0 ? score / count : 50,
      liquidityCount: count,
    };
  }

  /**
   * Assess profitability ratios
   */
  private static assessProfitabilityRatios(ratios: FinancialRatios): {
    profitabilityScore: number;
    profitabilityCount: number;
  } {
    let score = 0;
    let count = 0;

    if (ratios.netMargin !== undefined) {
      count++;
      if (ratios.netMargin >= 20) score += 30;
      else if (ratios.netMargin >= 10) score += 25;
      else if (ratios.netMargin >= 5) score += 20;
      else if (ratios.netMargin >= 0) score += 15;
      else score += 5;
    }

    if (ratios.returnOnAssets !== undefined) {
      count++;
      if (ratios.returnOnAssets >= 10) score += 25;
      else if (ratios.returnOnAssets >= 5) score += 20;
      else if (ratios.returnOnAssets >= 2) score += 15;
      else score += 10;
    }

    if (ratios.returnOnEquity !== undefined) {
      count++;
      if (ratios.returnOnEquity >= 20) score += 25;
      else if (ratios.returnOnEquity >= 15) score += 20;
      else if (ratios.returnOnEquity >= 10) score += 15;
      else score += 10;
    }

    return {
      profitabilityScore: count > 0 ? score / count : 50,
      profitabilityCount: count,
    };
  }

  /**
   * Assess leverage ratios
   */
  private static assessLeverageRatios(ratios: FinancialRatios): {
    leverageScore: number;
    leverageCount: number;
  } {
    let score = 0;
    let count = 0;

    if (ratios.debtToEquity !== undefined) {
      count++;
      if (ratios.debtToEquity <= 0.5) score += 30;
      else if (ratios.debtToEquity <= 1) score += 25;
      else if (ratios.debtToEquity <= 2) score += 20;
      else score += 10;
    }

    if (ratios.debtRatio !== undefined) {
      count++;
      if (ratios.debtRatio <= 0.3) score += 25;
      else if (ratios.debtRatio <= 0.5) score += 20;
      else if (ratios.debtRatio <= 0.7) score += 15;
      else score += 10;
    }

    if (ratios.interestCoverage !== undefined) {
      count++;
      if (ratios.interestCoverage >= 5) score += 25;
      else if (ratios.interestCoverage >= 3) score += 20;
      else if (ratios.interestCoverage >= 1.5) score += 15;
      else score += 8;
    }

    return {
      leverageScore: count > 0 ? score / count : 50,
      leverageCount: count,
    };
  }

  /**
   * Assess efficiency ratios
   */
  private static assessEfficiencyRatios(ratios: FinancialRatios): {
    efficiencyScore: number;
    efficiencyCount: number;
  } {
    let score = 0;
    let count = 0;

    if (ratios.assetTurnover !== undefined) {
      count++;
      if (ratios.assetTurnover >= 2) score += 25;
      else if (ratios.assetTurnover >= 1) score += 20;
      else score += 15;
    }

    if (ratios.inventoryTurnover !== undefined) {
      count++;
      if (ratios.inventoryTurnover >= 8) score += 20;
      else if (ratios.inventoryTurnover >= 5) score += 17;
      else score += 15;
    }

    if (ratios.receivablesTurnover !== undefined) {
      count++;
      if (ratios.receivablesTurnover >= 12) score += 20;
      else if (ratios.receivablesTurnover >= 8) score += 17;
      else score += 15;
    }

    return {
      efficiencyScore: count > 0 ? score / count : 50,
      efficiencyCount: count,
    };
  }

  /**
   * Convert score to credit rating grade
   */
  private static scoreToGrade(score: number): CreditRatingGrade {
    if (score >= 90) return CreditRatingGrade.AAA;
    if (score >= 80) return CreditRatingGrade.AA;
    if (score >= 70) return CreditRatingGrade.A;
    if (score >= 60) return CreditRatingGrade.BBB;
    if (score >= 50) return CreditRatingGrade.BB;
    if (score >= 40) return CreditRatingGrade.B;
    if (score >= 30) return CreditRatingGrade.CCC;
    return CreditRatingGrade.D;
  }

  /**
   * Generate fallback analysis if AI fails
   */
  private static generateFallbackAnalysis(ratios: FinancialRatios): CreditAnalysisReport {
    const ratioCount = Object.values(ratios).filter((v) => v !== undefined).length;

    return {
      executiveSummary: `Credit analysis completed based on ${ratioCount} calculated financial ratios. AI-powered detailed analysis was unavailable. Please review the calculated ratios and financial data to make an informed credit decision.`,
      strengths: ratioCount > 0 ? ['Financial data available for analysis'] : [],
      weaknesses: ratioCount === 0 ? ['Insufficient financial data for comprehensive analysis'] : [],
      riskFactors: [
        {
          factor: 'Limited data availability',
          severity: 'MEDIUM',
          impact: 'Analysis based on limited financial information',
        },
      ],
      recommendations: [
        'Obtain complete financial statements for comprehensive analysis',
        'Review additional operational and market data',
        'Conduct management interview for qualitative assessment',
      ],
      detailedAnalysis: 'Automated analysis based on available financial ratios. Manual review recommended.',
    };
  }

  /**
   * Format ratio name for display
   */
  private static formatRatioName(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  /**
   * Format currency value
   * @deprecated Use formatAmount from formatters.ts instead
   */
  private static formatCurrency(value: number): string {
    return formatAmount(value);
  }
}



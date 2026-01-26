/**
 * Email template for Client Acceptance Approval notifications
 */

export interface ClientAcceptanceApprovalEmailData {
  approverName: string;
  approverEmail: string;
  clientName: string;
  clientCode: string;
  riskRating: string;
  riskScore?: number;
  submittedByName: string;
  approvalUrl: string;
}

/**
 * Generate HTML email content for client acceptance approval notification
 */
export function generateClientAcceptanceApprovalHtml(
  data: ClientAcceptanceApprovalEmailData
): string {
  const riskColor = 
    data.riskRating === 'HIGH' ? '#dc2626' : 
    data.riskRating === 'MEDIUM' ? '#f59e0b' : 
    '#059669';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Client Acceptance Approval Required - Forvis Mazars</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #212529;
      background-color: #f8f9fa;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%);
      color: #ffffff;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .header p {
      margin: 8px 0 0 0;
      font-size: 14px;
      opacity: 0.95;
    }
    .content {
      padding: 30px 20px;
    }
    .content p {
      margin: 0 0 15px 0;
      color: #343a40;
    }
    .greeting {
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 20px;
    }
    .info-box {
      background-color: #f0f7fd;
      border-left: 4px solid #2E5AAC;
      padding: 20px;
      margin: 25px 0;
      border-radius: 4px;
    }
    .info-box strong {
      display: block;
      margin-bottom: 12px;
      color: #2E5AAC;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #e0edfb;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #6c757d;
      font-size: 14px;
      font-weight: 500;
    }
    .info-value {
      color: #212529;
      font-size: 14px;
      font-weight: 600;
    }
    .risk-badge {
      display: inline-block;
      background-color: ${riskColor};
      color: #ffffff;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      margin: 25px 0;
      font-weight: 600;
      font-size: 15px;
      box-shadow: 0 2px 4px rgba(46, 90, 172, 0.3);
      transition: all 0.2s;
    }
    .button:hover {
      box-shadow: 0 4px 8px rgba(46, 90, 172, 0.4);
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
      border-top: 1px solid #e9ecef;
    }
    .footer p {
      margin: 5px 0;
    }
    .divider {
      height: 1px;
      background-color: #e9ecef;
      margin: 25px 0;
    }
    .note {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
      font-size: 14px;
      color: #856404;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Approval Required</h1>
      <p>Client Acceptance Assessment</p>
    </div>
    
    <div class="content">
      <p class="greeting">Hi ${data.approverName},</p>
      
      <p>A client acceptance assessment has been submitted and requires your approval as the assigned partner.</p>
      
      <div class="info-box">
        <strong>Client Details</strong>
        <div class="info-row">
          <span class="info-label">Client Name:</span>
          <span class="info-value">${data.clientName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Client Code:</span>
          <span class="info-value">${data.clientCode}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Risk Rating:</span>
          <span class="risk-badge">${data.riskRating}${data.riskScore ? ` (${data.riskScore.toFixed(1)}%)` : ''}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Submitted By:</span>
          <span class="info-value">${data.submittedByName}</span>
        </div>
      </div>
      
      <p>Please review the assessment details and provide your decision. You can:</p>
      <ul style="color: #343a40; margin: 15px 0; padding-left: 20px;">
        <li><strong>Approve</strong> the assessment to proceed with client engagement</li>
        <li><strong>Edit & Approve</strong> to make adjustments before approval</li>
        <li><strong>Reject</strong> the assessment with feedback</li>
      </ul>
      
      <center>
        <a href="${data.approvalUrl}" class="button">Review & Approve</a>
      </center>
      
      <div class="divider"></div>
      
      <p style="color: #6c757d; font-size: 14px; margin-top: 20px;">
        <strong>Need Help?</strong><br>
        Log in to the Forvis Mazars platform to access the full assessment details and approval workflow.
      </p>
    </div>
    
    <div class="footer">
      <p><strong>Forvis Mazars Client Acceptance Platform</strong></p>
      <p>This is an automated notification. Please do not reply to this email.</p>
      <p style="margin-top: 10px;">
        <a href="${data.approvalUrl}" style="color: #2E5AAC; text-decoration: none;">View My Approvals</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate plain text email content for client acceptance approval notification
 */
export function generateClientAcceptanceApprovalText(
  data: ClientAcceptanceApprovalEmailData
): string {
  return `
APPROVAL REQUIRED: Client Acceptance Assessment

Hi ${data.approverName},

A client acceptance assessment has been submitted and requires your approval as the assigned partner.

CLIENT DETAILS:
- Client Name: ${data.clientName}
- Client Code: ${data.clientCode}
- Risk Rating: ${data.riskRating}${data.riskScore ? ` (${data.riskScore.toFixed(1)}%)` : ''}
- Submitted By: ${data.submittedByName}

Please review the assessment details and provide your decision. You can:
- Approve the assessment to proceed with client engagement
- Edit & Approve to make adjustments before approval
- Reject the assessment with feedback

Review & Approve: ${data.approvalUrl}

NEED HELP?
Log in to the Forvis Mazars platform to access the full assessment details and approval workflow.

---
Forvis Mazars Client Acceptance Platform
This is an automated notification. Please do not reply to this email.

View My Approvals: ${data.approvalUrl}
  `.trim();
}

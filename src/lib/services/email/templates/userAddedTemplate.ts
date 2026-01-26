import { UserAddedEmailData } from '@/types/email';
import { formatRole } from '@/lib/utils/taskUtils';

/**
 * Generate HTML email content for user added notification
 */
export function generateUserAddedHtml(data: UserAddedEmailData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Added to Project - Mazars Tax Platform</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background-color: #0066cc;
      color: #ffffff;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 30px 20px;
    }
    .content p {
      margin: 0 0 15px 0;
    }
    .info-box {
      background-color: #f8f9fa;
      border-left: 4px solid #0066cc;
      padding: 15px;
      margin: 20px 0;
    }
    .info-box strong {
      display: block;
      margin-bottom: 5px;
      color: #0066cc;
    }
    .button {
      display: inline-block;
      background-color: #0066cc;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 30px;
      border-radius: 4px;
      margin: 20px 0;
      font-weight: 600;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .role-badge {
      display: inline-block;
      background-color: #e7f3ff;
      color: #0066cc;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>You've Been Added to a Project</h1>
    </div>
    
    <div class="content">
      <p>Hi ${data.addedUser.name || data.addedUser.email},</p>
      
      <p>You have been added to a project on the Mazars Tax Platform.</p>
      
      <div class="info-box">
        <strong>Project Details:</strong>
        <p style="margin: 5px 0 0 0;">
          <strong>Name:</strong> ${data.task.name}<br>
          <strong>Your Role:</strong> <span class="role-badge">${formatRole(data.role)}</span><br>
          <strong>Added By:</strong> ${data.addedBy.name || data.addedBy.email}
        </p>
      </div>
      
      <p>You can now access this project and collaborate with your team.</p>
      
      <center>
        <a href="${data.taskUrl}" class="button">View Project</a>
      </center>
      
      <p style="margin-top: 30px; color: #666; font-size: 14px;">
        If you have any questions about this project, please contact ${data.addedBy.name || data.addedBy.email}.
      </p>
    </div>
    
    <div class="footer">
      <p>Mazars Tax Calculation & Opinion Platform</p>
      <p style="margin: 5px 0 0 0;">
        This is an automated notification. Please do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate plain text email content for user added notification
 */
export function generateUserAddedText(data: UserAddedEmailData): string {
  return `
You've Been Added to a Project

Hi ${data.addedUser.name || data.addedUser.email},

You have been added to a project on the Mazars Tax Platform.

Project Details:
- Name: ${data.task.name}
- Your Role: ${formatRole(data.role)}
- Added By: ${data.addedBy.name || data.addedBy.email}

You can now access this project and collaborate with your team.

View Task: ${data.taskUrl}

If you have any questions about this project, please contact ${data.addedBy.name || data.addedBy.email}.

---
Mazars Tax Calculation & Opinion Platform
This is an automated notification. Please do not reply to this email.
  `.trim();
}




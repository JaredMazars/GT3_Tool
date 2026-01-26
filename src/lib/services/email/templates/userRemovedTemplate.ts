import { UserRemovedEmailData } from '@/types/email';

/**
 * Generate HTML email content for user removed notification
 */
export function generateUserRemovedHtml(data: UserRemovedEmailData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Removed from Project - Mazars Tax Platform</title>
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
      background-color: #666;
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
      border-left: 4px solid #666;
      padding: 15px;
      margin: 20px 0;
    }
    .info-box strong {
      display: block;
      margin-bottom: 5px;
      color: #666;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Removed from Project</h1>
    </div>
    
    <div class="content">
      <p>Hi ${data.removedUser.name || data.removedUser.email},</p>
      
      <p>You have been removed from a project on the Mazars Tax Platform.</p>
      
      <div class="info-box">
        <strong>Project Details:</strong>
        <p style="margin: 5px 0 0 0;">
          <strong>Name:</strong> ${data.task.name}<br>
          <strong>Removed By:</strong> ${data.removedBy.name || data.removedBy.email}
        </p>
      </div>
      
      <p>You no longer have access to this project.</p>
      
      <p style="margin-top: 30px; color: #666; font-size: 14px;">
        If you believe this was done in error or have questions, please contact ${data.removedBy.name || data.removedBy.email} or your system administrator.
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
 * Generate plain text email content for user removed notification
 */
export function generateUserRemovedText(data: UserRemovedEmailData): string {
  return `
Removed from Project

Hi ${data.removedUser.name || data.removedUser.email},

You have been removed from a project on the Mazars Tax Platform.

Project Details:
- Name: ${data.task.name}
- Removed By: ${data.removedBy.name || data.removedBy.email}

You no longer have access to this project.

If you believe this was done in error or have questions, please contact ${data.removedBy.name || data.removedBy.email} or your system administrator.

---
Mazars Tax Calculation & Opinion Platform
This is an automated notification. Please do not reply to this email.
  `.trim();
}




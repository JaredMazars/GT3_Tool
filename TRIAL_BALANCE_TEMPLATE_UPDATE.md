# Trial Balance Template Update Instructions

## Required Changes to `/public/trial-balance-template.xlsx`

The trial balance template needs to be updated to include the "Prior Year Balance" column for comparative reporting.

### Updated Column Structure

The Excel template should have these columns in order:

1. **Account Code** - Account identifier (e.g., "1000", "4000")
2. **Account Name** - Full account name (e.g., "Cash at Bank", "Sales Revenue")
3. **Section** - Must be either "Balance Sheet" or "Income Statement"
4. **Balance** - Current year numerical values
5. **Prior Year Balance** - Prior year numerical values (NEW COLUMN)

### Sample Data

Add these example rows to show users the correct format:

| Account Code | Account Name | Section | Balance | Prior Year Balance |
|-------------|--------------|---------|---------|-------------------|
| 1000 | Cash at Bank | Balance Sheet | 50000.00 | 45000.00 |
| 1100 | Accounts Receivable | Balance Sheet | 35000.00 | 32000.00 |
| 2000 | Accounts Payable | Balance Sheet | -25000.00 | -22000.00 |
| 4000 | Sales Revenue | Income Statement | -75000.00 | -70000.00 |
| 5000 | Cost of Sales | Income Statement | 30000.00 | 28000.00 |
| 6000 | Operating Expenses | Income Statement | 20000.00 | 18000.00 |

### Sign Conventions (Important to Document in Template)

**Balance Sheet:**
- Positive values = Assets
- Negative values = Liabilities and Equity

**Income Statement:**
- Negative values = Income/Revenue
- Positive values = Expenses

### Steps to Update the Template

1. Open `/public/trial-balance-template.xlsx` in Excel
2. Insert a new column after the "Balance" column
3. Add the header "Prior Year Balance" in the new column
4. Update the sample data to include prior year values
5. Add a note/comment in the template explaining that prior year data is required
6. Save the file

### Alternative: Create New Template from Scratch

If preferred, you can create a new Excel template with the structure above and replace the existing file.





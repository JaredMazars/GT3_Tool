import { prisma } from '../src/lib/db/prisma';

async function checkRatings() {
  try {
    console.log('Checking credit ratings in database...\n');
    
    // Get all clients with credit ratings
    const clients = await prisma.client.findMany({
      where: {
        ClientCreditRating: {
          some: {},
        },
      },
      select: {
        id: true,
        clientCode: true,
        clientNameFull: true,
      },
    });

    console.log(`Found ${clients.length} clients with credit ratings:\n`);
    
    for (const client of clients) {
      console.log(`Client: ${client.clientNameFull || client.clientCode} (ID: ${client.id})`);
      
      const ratings = await prisma.clientCreditRating.findMany({
        where: { clientId: client.id },
        orderBy: { ratingDate: 'desc' },
        include: {
          Documents: {
            include: {
              AnalyticsDocument: true,
            },
          },
        },
      });

      console.log(`  Total ratings: ${ratings.length}`);
      
      ratings.forEach((rating, index) => {
        console.log(`  Rating ${index + 1}:`);
        console.log(`    ID: ${rating.id}`);
        console.log(`    Grade: ${rating.ratingGrade}`);
        console.log(`    Score: ${rating.ratingScore}`);
        console.log(`    Confidence: ${rating.confidence}`);
        console.log(`    Date: ${rating.ratingDate}`);
        console.log(`    Analyzed By: ${rating.analyzedBy}`);
        console.log(`    Documents: ${rating.Documents.length}`);
        console.log(`    Analysis Report Length: ${rating.analysisReport.length} chars`);
        console.log(`    Financial Ratios Length: ${rating.financialRatios.length} chars`);
        
        // Try to parse the JSON
        try {
          const report = JSON.parse(rating.analysisReport);
          console.log(`    Analysis Report Keys: ${Object.keys(report).join(', ')}`);
        } catch (e) {
          console.log(`    ⚠️  Analysis Report is not valid JSON: ${e instanceof Error ? e.message : String(e)}`);
        }
        
        try {
          const ratios = JSON.parse(rating.financialRatios);
          console.log(`    Financial Ratios Keys: ${Object.keys(ratios).join(', ')}`);
        } catch (e) {
          console.log(`    ⚠️  Financial Ratios is not valid JSON: ${e instanceof Error ? e.message : String(e)}`);
        }
        console.log('');
      });
    }
    
    // Check for the specific client mentioned in the screenshot
    console.log('\nChecking for MAR1010 (GO GET PLANT HIRE)...\n');
    const specificClient = await prisma.client.findFirst({
      where: {
        clientCode: 'MAR1010',
      },
      include: {
        ClientCreditRating: {
          orderBy: { ratingDate: 'desc' },
        },
      },
    });

    if (specificClient) {
      console.log(`Found client: ${specificClient.clientNameFull || specificClient.clientCode}`);
      console.log(`Client ID: ${specificClient.id}`);
      console.log(`Total credit ratings: ${specificClient.ClientCreditRating.length}`);
    } else {
      console.log('Client MAR1010 not found');
    }
    
  } catch (error) {
    console.error('Error checking ratings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRatings();



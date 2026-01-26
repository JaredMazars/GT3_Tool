import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register fonts if needed, otherwise use default Helvetica
// Font.register({ family: 'Helvetica', src: '...' });

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Helvetica',
        fontSize: 10,
        lineHeight: 1.5,
    },
    titlePage: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    subTitle: {
        fontSize: 16,
        marginBottom: 15,
        textAlign: 'center',
    },
    metadata: {
        fontSize: 12,
        marginBottom: 10,
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 5,
        textTransform: 'uppercase',
    },
    tocTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    tocItem: {
        fontSize: 11,
        marginBottom: 5,
    },
    divider: {
        borderBottomWidth: 1,
        borderBottomColor: '#2E5AAC',
        marginBottom: 15,
    },
    paragraph: {
        marginBottom: 10,
        textAlign: 'justify',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: 8,
        color: 'grey',
    },
});

interface OpinionSection {
    title: string;
    content: string;
}

interface OpinionPDFProps {
    title: string;
    sections: OpinionSection[];
    metadata?: {
        taskName?: string;
        clientName?: string;
    };
}

export const OpinionPDF: React.FC<OpinionPDFProps> = ({ title, sections, metadata }) => (
    <Document>
        {/* Title Page */}
        <Page size="A4" style={styles.page}>
            <View style={styles.titlePage}>
                <Text style={styles.mainTitle}>TAX OPINION</Text>
                <Text style={styles.subTitle}>{title}</Text>

                {metadata?.clientName && (
                    <Text style={styles.metadata}>Client: {metadata.clientName}</Text>
                )}
                {metadata?.taskName && (
                    <Text style={styles.metadata}>Task: {metadata.taskName}</Text>
                )}

                <Text style={[styles.metadata, { marginTop: 20 }]}>
                    {new Date().toLocaleDateString('en-ZA', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    })}
                </Text>
            </View>
        </Page>

        {/* Table of Contents */}
        <Page size="A4" style={styles.page}>
            <Text style={styles.tocTitle}>TABLE OF CONTENTS</Text>
            {sections.map((section, index) => (
                <Text key={index} style={styles.tocItem}>
                    {index + 1}. {section.title}
                </Text>
            ))}
        </Page>

        {/* Sections */}
        <Page size="A4" style={styles.page}>
            {sections.map((section, index) => (
                <View key={index} break={index > 0}>
                    <Text style={styles.sectionTitle}>
                        {index + 1}. {section.title}
                    </Text>
                    <View style={styles.divider} />

                    {section.content.split('\n\n').map((para, pIndex) => (
                        <Text key={pIndex} style={styles.paragraph}>
                            {para.trim()}
                        </Text>
                    ))}
                </View>
            ))}

            <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
                `Generated on ${new Date().toLocaleDateString('en-ZA')} - Page ${pageNumber} of ${totalPages}`
            )} fixed />
        </Page>
    </Document>
);

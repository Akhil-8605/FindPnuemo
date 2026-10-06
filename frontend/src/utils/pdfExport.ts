import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AnalysisData } from '../types';

/**
 * Downloads a structured, multi-page clinical chest X-ray PDF report
 * using high-fidelity canvas slicing to preserve exact modal styling and A4 alignment.
 */
export async function downloadAnalysisPdf(
  analysis: AnalysisData,
  reportElementId: string = 'printable-report-content'
): Promise<void> {
  const element = document.getElementById(reportElementId);

  // If DOM element exists, capture high-res canvas and export to A4 PDF with exact alignment
  if (element) {
    try {
      // 1. Capture high-res canvas with html2canvas (retina scale 2 for crisp vector/text)
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF',
        scrollX: 0,
        scrollY: 0,
        windowWidth: element.scrollWidth,
        ignoreElements: (el) => {
          return (
            el.hasAttribute('data-html2canvas-ignore') ||
            el.classList.contains('print:hidden') ||
            el.classList.contains('no-pdf')
          );
        },
      });

      // 2. Initialize A4 jsPDF (210 x 297 mm)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfPageWidth = 210;
      const pdfPageHeight = 297;

      const totalWidth = canvas.width;
      const totalHeight = canvas.height;

      // Exact pixel height corresponding to one A4 portrait page
      const pageHeightInCanvasPixels = Math.floor((totalWidth * pdfPageHeight) / pdfPageWidth);

      let renderedHeight = 0;
      let pageIndex = 0;

      while (renderedHeight < totalHeight) {
        if (pageIndex > 0) {
          pdf.addPage();
        }

        // Sliced height for the current A4 page
        const currentSliceHeight = Math.min(
          pageHeightInCanvasPixels,
          totalHeight - renderedHeight
        );

        // Offscreen canvas representing the exact A4 page
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = totalWidth;
        pageCanvas.height = pageHeightInCanvasPixels;

        const pageCtx = pageCanvas.getContext('2d');
        if (pageCtx) {
          // Clean white page background
          pageCtx.fillStyle = '#FFFFFF';
          pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

          // Draw the precise slice from source canvas
          pageCtx.drawImage(
            canvas,
            0,
            renderedHeight,
            totalWidth,
            currentSliceHeight,
            0,
            0,
            totalWidth,
            currentSliceHeight
          );

          const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.98);
          pdf.addImage(pageImgData, 'JPEG', 0, 0, pdfPageWidth, pdfPageHeight);
        }

        renderedHeight += pageHeightInCanvasPixels;
        pageIndex++;
      }

      pdf.save(`FindPneumo_Clinical_Report_${analysis.id}.pdf`);
      return;
    } catch (err) {
      console.warn('html2canvas export failed, falling back to direct vector jsPDF', err);
    }
  }

  // Fallback direct jsPDF document generation if DOM is unavailable
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const margin = 15;
  let y = margin;

  // Header Banner
  doc.setFillColor(20, 21, 23);
  doc.rect(margin, y, 180, 16, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('FINDPNEUMO — CLINICAL RADIOGRAPHY REPORT', margin + 6, y + 10.5);

  y += 24;

  // Metadata Box
  doc.setDrawColor(20, 21, 23);
  doc.setLineWidth(0.8);
  doc.setFillColor(244, 244, 240);
  doc.rect(margin, y, 180, 24, 'FD');

  doc.setTextColor(20, 21, 23);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`RECORD ID: ${analysis.id}`, margin + 5, y + 7);
  doc.text(`PATIENT REF: ${analysis.patientRef}`, margin + 5, y + 14);
  doc.text(`DATE / TIME: ${analysis.timestamp}`, margin + 5, y + 21);

  doc.text(`SCAN TYPE: ${analysis.projection}`, margin + 100, y + 7);
  doc.text(`PRIMARY STATUS: ${analysis.resultStatus.toUpperCase()}`, margin + 100, y + 14);
  doc.text(`CONFIDENCE SCORE: ${analysis.overallConfidence}%`, margin + 100, y + 21);

  y += 32;

  // Headline
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 21, 23);
  doc.text(analysis.resultHeadline, margin, y);

  y += 8;

  // Editorial Summary
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  const summaryLines = doc.splitTextToSize(analysis.editorialSummary, 180);
  doc.text(summaryLines, margin, y);

  y += summaryLines.length * 5 + 8;

  // Findings Section Header
  doc.setFillColor(240, 240, 235);
  doc.rect(margin, y, 180, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 21, 23);
  doc.text(`IDENTIFIED FINDINGS (${analysis.findings.length} REGIONS)`, margin + 4, y + 5.5);

  y += 14;

  // List each finding
  analysis.findings.forEach((finding, idx) => {
    if (y > 250) {
      doc.addPage();
      y = margin;
    }

    doc.setDrawColor(20, 21, 23);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, 180, 28);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(20, 21, 23);
    doc.text(`0${idx + 1}. ${finding.title} (${finding.confidence}% Certainty)`, margin + 4, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    doc.text(`Region: ${finding.anatomicalRegion} | Extent: ${finding.damageExtent}`, margin + 4, y + 12);

    const descLines = doc.splitTextToSize(finding.patientExplanation, 172);
    doc.text(descLines, margin + 4, y + 18);

    y += 33;
  });

  // Footer Disclaimer
  if (y > 265) {
    doc.addPage();
    y = margin;
  }
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Important Notice: FindPneumo is an AI screening assistant and not an official medical diagnosis.', margin, y + 10);
  doc.text('Team LowIQBots (Akhilesh, Kshitija, Gouri, Shruti) · Radiograph Analysis v2026.4', margin, y + 15);

  doc.save(`FindPneumo_Clinical_Report_${analysis.id}.pdf`);
}

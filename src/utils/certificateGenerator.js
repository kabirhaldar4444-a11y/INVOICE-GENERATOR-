import { 
  PDFDocument, 
  rgb, 
  StandardFonts,
  pushGraphicsState, 
  moveTo, 
  lineTo, 
  closePath, 
  setFillingColor, 
  setStrokingColor,
  setLineWidth,
  fill, 
  stroke,
  fillAndStroke,
  popGraphicsState,
  appendBezierCurve
} from 'pdf-lib';

/**
 * Generates a professional certificate PDF for iSuccessNode.
 * 
 * @param {Object} data Certificate data
 * @param {string} data.studentName Student's full name
 * @param {string} data.courseName e.g. "CSLP"
 * @param {string} data.duration e.g. "90 Days"
 * @param {string} data.enrollmentDate e.g. "10-07-2026"
 * @param {string} data.certificateNo e.g. "133JLE9067"
 * @param {string} data.validityDate e.g. "10-07-2036"
 * @param {string} data.status e.g. "UNDER TRAINING"
 */
export const generateCertificatePDF = async (data) => {
  const {
    studentName,
    courseName = 'CSLP',
    duration = '90 Days',
    enrollmentDate,
    certificateNo,
    validityDate,
    status = 'UNDER TRAINING'
  } = data;

  try {
    // 1. Create a PDF Document
    const pdfDoc = await PDFDocument.create();

    // 2. Add an A4 landscape sized page (841.89 x 595.276 points)
    const page = pdfDoc.addPage([841.89, 595.276]);
    const { width, height } = page.getSize();

    // 3. Embed Standard Fonts
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // 4. Draw Purple Header Banner with a curved bottom
    const colorPurple = rgb(76 / 255, 32 / 255, 113 / 255); // Deep Purple
    const opsPurple = [
      pushGraphicsState(),
      setFillingColor(colorPurple),
      moveTo(0, height),
      lineTo(0, height - 135),
      appendBezierCurve(0, height - 135, width * 0.45, height - 170, width * 0.75, height - 115, width, height - 120),
      lineTo(width, height),
      closePath(),
      fill(),
      popGraphicsState()
    ];
    page.pushOperators(...opsPurple);

    // 5. Draw Gold Accent Wave
    const colorGold = rgb(197 / 255, 137 / 255, 27 / 255); // Gold
    const opsGold = [
      pushGraphicsState(),
      setFillingColor(colorGold),
      moveTo(0, height - 135),
      appendBezierCurve(0, height - 135, width * 0.45, height - 170, width * 0.75, height - 115, width, height - 120),
      lineTo(width, height - 128),
      appendBezierCurve(width, height - 128, width * 0.75, height - 123, width * 0.45, height - 178, 0, height - 143),
      closePath(),
      fill(),
      popGraphicsState()
    ];
    page.pushOperators(...opsGold);

    // 6. Fetch and Embed Logos in Purple Banner
    // Left Logo: I Success Node
    try {
      const isnLogoBytes = await fetch('/logos/isuccessnode.png').then(res => res.arrayBuffer());
      const isnLogoImage = await pdfDoc.embedPng(isnLogoBytes);
      const isnW = 160;
      const isnH = 50;
      page.drawImage(isnLogoImage, {
        x: 35,
        y: height - 85,
        width: isnW,
        height: isnH
      });
    } catch (e) {
      console.warn('Failed to embed iSuccessNode logo:', e);
    }

    // Right Logo: PMIS
    try {
      const pmisLogoBytes = await fetch('/pmis-logo.png').then(res => res.arrayBuffer());
      const pmisLogoImage = await pdfDoc.embedPng(pmisLogoBytes);
      const pmiW = 160;
      const pmiH = 55;
      page.drawImage(pmisLogoImage, {
        x: width - 195,
        y: height - 88,
        width: pmiW,
        height: pmiH
      });
    } catch (e) {
      console.warn('Failed to embed PMIS logo:', e);
    }

    // 7. Draw "THIS IS TO CERTIFY THAT"
    const colorSlate800 = rgb(30 / 255, 41 / 255, 59 / 255);
    page.drawText('THIS IS TO CERTIFY THAT', {
      x: 35,
      y: 355,
      font: fontBold,
      size: 13,
      color: colorSlate800
    });

    // 8. Draw Status Banner on the top-right
    page.drawText('Status: ', {
      x: width - 250,
      y: 355,
      font: fontBold,
      size: 13,
      color: colorSlate800
    });
    const colorOrange = rgb(217 / 255, 119 / 255, 6 / 255); // orange-600
    page.drawText(status.toUpperCase(), {
      x: width - 195,
      y: 355,
      font: fontBold,
      size: 13,
      color: colorOrange
    });

    // 9. Draw Student's Full Name (Large Font)
    page.drawText(studentName, {
      x: 35,
      y: 295,
      font: fontRegular,
      size: 36,
      color: rgb(0, 0, 0)
    });

    // 10. Draw Left Details Panel (Course info)
    const details = [
      { label: 'Course Name:', value: courseName },
      { label: 'Course Duration:', value: duration },
      { label: 'Enrollment Date:', value: enrollmentDate },
      { label: 'Certificate Number:', value: certificateNo },
      { label: 'Validity:', value: validityDate }
    ];

    let currentY = 225;
    details.forEach(item => {
      // Draw Label
      page.drawText(item.label, {
        x: 35,
        y: currentY,
        font: fontBold,
        size: 11.5,
        color: rgb(0, 0, 0)
      });
      
      // Calculate offset based on label length to draw the value next to it
      const labelWidth = fontBold.widthOfTextAtSize(item.label + ' ', 11.5);
      
      // Draw Value
      page.drawText(item.value, {
        x: 35 + labelWidth,
        y: currentY,
        font: fontBold,
        size: 11.5,
        color: rgb(0, 0, 0)
      });

      currentY -= 24;
    });

    // 11. Draw Signature Center-Right
    try {
      const sigBytes = await fetch('/signature.png').then(res => res.arrayBuffer());
      const sigImage = await pdfDoc.embedPng(sigBytes);
      
      // Rectangular aspect ratio, fit inside 130x50
      const sigW = 130;
      const sigH = 50;
      const sigX = 425;
      const sigY = 95;

      page.drawImage(sigImage, {
        x: sigX,
        y: sigY,
        width: sigW,
        height: sigH
      });
      
      // Line under signature
      page.drawLine({
        start: { x: sigX - 10, y: sigY - 5 },
        end: { x: sigX + sigW + 10, y: sigY - 5 },
        color: rgb(180 / 255, 180 / 255, 180 / 255),
        thickness: 0.8
      });

      // Name text
      const nameText = 'Vikram Nair';
      const nameTextW = fontBold.widthOfTextAtSize(nameText, 10);
      page.drawText(nameText, {
        x: sigX + (sigW - nameTextW) / 2,
        y: sigY - 18,
        font: fontBold,
        size: 10,
        color: rgb(0, 0, 0)
      });

      // Title text
      const titleText = 'Head of Training';
      const titleTextW = fontBold.widthOfTextAtSize(titleText, 8.5);
      page.drawText(titleText, {
        x: sigX + (sigW - titleTextW) / 2,
        y: sigY - 29,
        font: fontBold,
        size: 8.5,
        color: rgb(0, 0, 0)
      });

    } catch (e) {
      console.warn('Failed to embed signature:', e);
    }

    // 12. Draw Stamp on the Far Right
    try {
      const stampBytes = await fetch('/stamp.png').then(res => res.arrayBuffer());
      const stampImage = await pdfDoc.embedPng(stampBytes);
      
      const stampW = 120;
      const stampH = 110;
      page.drawImage(stampImage, {
        x: width - 170,
        y: 65,
        width: stampW,
        height: stampH
      });
    } catch (e) {
      console.warn('Failed to embed stamp:', e);
    }

    // Save and return PDF bytes
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;

  } catch (error) {
    console.error('Error generating certificate PDF:', error);
    throw error;
  }
};

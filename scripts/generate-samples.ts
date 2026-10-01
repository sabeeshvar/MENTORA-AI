import fs from 'fs'
import path from 'path'
import JSZip from 'jszip'

async function generateSampleFiles() {
  const dir = path.join(process.cwd(), 'public', 'samples')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  // 1. Generate sample PDF
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 6 0 R >>
endobj
5 0 obj
<< /Length 120 >>
stream
BT
/F1 14 Tf
72 712 Td
(Unit 1: Fundamentals of Artificial Intelligence) Tj
0 -25 Td
/F1 11 Tf
(Machine learning enables systems to learn from data patterns without being explicitly programmed.) Tj
ET
endstream
endobj
6 0 obj
<< /Length 135 >>
stream
BT
/F1 14 Tf
72 712 Td
(Unit 2: Loss Functions and Convergence) Tj
0 -25 Td
/F1 11 Tf
(Mean squared error and cross entropy measure model divergence from target labels during gradient updates.) Tj
ET
endstream
endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000121 00000 n 
0000000210 00000 n 
0000000299 00000 n 
0000000470 00000 n 
trailer
<< /Size 7 /Root 1 0 R >>
startxref
656
%%EOF`

  fs.writeFileSync(path.join(dir, 'AI_Fundamentals.pdf'), pdfContent, 'utf-8')
  console.log('Created public/samples/AI_Fundamentals.pdf')

  // 2. Generate sample PPTX
  const zip = new JSZip()
  const slide1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="1" name="Title 1"/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
        <p:txBody><a:p><a:r><a:t>Lecture 1: Convolutional Neural Networks</a:t></a:r></a:p></p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Body 1"/></p:nvPr>
        <p:txBody><a:p><a:r><a:t>CNN architectures use convolution kernels, pooling layers, and ReLU activation functions to process spatial image grids.</a:t></a:r></a:p></p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`

  const slide2Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="3" name="Title 2"/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
        <p:txBody><a:p><a:r><a:t>Lecture 2: Transformer Architectures</a:t></a:r></a:p></p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="4" name="Body 2"/></p:nvPr>
        <p:txBody><a:p><a:r><a:t>The self-attention mechanism enables transformers to weigh tokens across sequences simultaneously without recurrent bottlenecking.</a:t></a:r></a:p></p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`

  zip.file('ppt/slides/slide1.xml', slide1Xml)
  zip.file('ppt/slides/slide2.xml', slide2Xml)

  const pptxBuffer = await zip.generateAsync({ type: 'nodebuffer' })
  fs.writeFileSync(path.join(dir, 'Deep_Learning_Architectures.pptx'), pptxBuffer)
  console.log('Created public/samples/Deep_Learning_Architectures.pptx')
}

generateSampleFiles().catch(console.error)

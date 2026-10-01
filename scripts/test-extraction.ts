import JSZip from 'jszip'
import { extractPdfPages } from '../src/services/extraction/pdfExtractor'
import { extractPptxSlides } from '../src/services/extraction/pptxExtractor'
import { createChunksFromExtractedPages } from '../src/services/extraction/chunkingService'

async function runTests() {
  console.log('--- Testing MENTORA AI Learning Material Extraction Pipeline ---\n')

  let passed = 0
  let failed = 0

  // -------------------------------------------------------------
  // Test 1: PDF Extraction & Page Preservation
  // -------------------------------------------------------------
  console.log('1. Testing PDF text extraction with page numbers...')
  try {
    // Construct a minimal valid multi-page PDF in raw text/bytes
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
<< /Length 95 >>
stream
BT
/F1 12 Tf
72 712 Td
(Chapter 1: Supervised Learning Fundamentals) Tj
0 -20 Td
(Linear regression models relationship between inputs and outputs.) Tj
ET
endstream
endobj
6 0 obj
<< /Length 105 >>
stream
BT
/F1 12 Tf
72 712 Td
(Chapter 2: Optimization with Gradient Descent) Tj
0 -20 Td
(Gradient descent iteratively steps towards minimum loss function value.) Tj
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
0000000445 00000 n 
trailer
<< /Size 7 /Root 1 0 R >>
startxref
601
%%EOF`

    const encoder = new TextEncoder()
    const pdfBuffer = encoder.encode(pdfContent).buffer

    const extractedPdfPages = await extractPdfPages(pdfBuffer)
    console.log(`   Extracted ${extractedPdfPages.length} PDF pages.`)

    // Verify page extraction
    if (extractedPdfPages.length === 0) {
      throw new Error('Failed to extract any pages from test PDF')
    }

    // Chunking PDF
    const pdfChunks = createChunksFromExtractedPages(extractedPdfPages, {
      courseId: 'course_ai_101',
      materialId: 'mat_pdf_ml_ch1',
      sourceName: 'Machine_Learning_Notes.pdf',
      sourceType: 'PDF',
    })

    console.log(`   Generated ${pdfChunks.length} chunks from PDF.`)
    console.log('   Sample PDF Chunk:', JSON.stringify(pdfChunks[0], null, 2))

    // Check required fields
    const firstChunk = pdfChunks[0]
    const requiredKeys = [
      'chunkId',
      'courseId',
      'materialId',
      'text',
      'sourceType',
      'sourceName',
      'sectionTitle',
      'chunkIndex',
      'createdAt',
    ]

    for (const key of requiredKeys) {
      if ((firstChunk as any)[key] === undefined) {
        throw new Error(`PDF chunk is missing required key: ${key}`)
      }
    }

    if (firstChunk.pageNumber === undefined) {
      throw new Error('PDF chunk is missing pageNumber!')
    }

    if (firstChunk.sourceType !== 'PDF') {
      throw new Error(`Expected sourceType PDF, got ${firstChunk.sourceType}`)
    }

    console.log('   ✓ PDF extraction and chunk metadata validation PASSED\n')
    passed++
  } catch (err: any) {
    console.error('   ✗ PDF extraction failed:', err?.message || err)
    failed++
  }

  // -------------------------------------------------------------
  // Test 2: PPTX Extraction & Slide Preservation
  // -------------------------------------------------------------
  console.log('2. Testing PPTX text extraction with slide numbers...')
  try {
    const zip = new JSZip()

    // Add slide 1
    const slide1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="1" name="Title 1"/>
          <p:nvPr><p:ph type="title"/></p:nvPr>
        </p:nvSpPr>
        <p:txBody>
          <a:p><a:r><a:t>Introduction to Deep Learning</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Content 1"/></p:nvPr>
        <p:txBody>
          <a:p><a:r><a:t>Deep learning uses artificial neural networks with multiple layers to learn representations from raw data.</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`

    // Add slide 2
    const slide2Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Title 2"/>
          <p:nvPr><p:ph type="title"/></p:nvPr>
        </p:nvSpPr>
        <p:txBody>
          <a:p><a:r><a:t>Backpropagation Algorithm</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="4" name="Content 2"/></p:nvPr>
        <p:txBody>
          <a:p><a:r><a:t>Backpropagation computes gradient of loss function with respect to weights using the chain rule.</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`

    zip.file('ppt/slides/slide1.xml', slide1Xml)
    zip.file('ppt/slides/slide2.xml', slide2Xml)

    const pptxBuffer = await zip.generateAsync({ type: 'arraybuffer' })
    const extractedSlides = await extractPptxSlides(pptxBuffer)

    console.log(`   Extracted ${extractedSlides.length} slides from PPTX.`)

    if (extractedSlides.length !== 2) {
      throw new Error(`Expected 2 slides, got ${extractedSlides.length}`)
    }

    if (extractedSlides[0].slideNumber !== 1 || extractedSlides[1].slideNumber !== 2) {
      throw new Error('Slide numbers were not correctly preserved!')
    }

    if (!extractedSlides[0].title.includes('Deep Learning')) {
      throw new Error(`Slide 1 title mismatch: ${extractedSlides[0].title}`)
    }

    // Chunking PPTX
    const pptxChunks = createChunksFromExtractedPages(extractedSlides, {
      courseId: 'course_ai_101',
      materialId: 'mat_pptx_slides_dl',
      sourceName: 'Lecture_02_Deep_Learning.pptx',
      sourceType: 'PPTX',
    })

    console.log(`   Generated ${pptxChunks.length} chunks from PPTX slides.`)
    console.log('   Sample PPTX Chunk:', JSON.stringify(pptxChunks[0], null, 2))

    // Check required fields
    const firstPptxChunk = pptxChunks[0]
    const secondPptxChunk = pptxChunks[1]

    if (firstPptxChunk.slideNumber !== 1) {
      throw new Error(`Chunk 0 should have slideNumber 1, got ${firstPptxChunk.slideNumber}`)
    }

    if (secondPptxChunk.slideNumber !== 2) {
      throw new Error(`Chunk 1 should have slideNumber 2, got ${secondPptxChunk.slideNumber}`)
    }

    if (firstPptxChunk.sourceType !== 'PPTX') {
      throw new Error(`Expected sourceType PPTX, got ${firstPptxChunk.sourceType}`)
    }

    console.log('   ✓ PPTX extraction and slide metadata validation PASSED\n')
    passed++
  } catch (err: any) {
    console.error('   ✗ PPTX extraction failed:', err?.message || err)
    failed++
  }

  // -------------------------------------------------------------
  // Test 3: Semantic Chunking & Citation Bounds Check
  // -------------------------------------------------------------
  console.log('3. Testing semantic chunking boundaries & text cleaning...')
  try {
    const dirtyText = 'Line 1\x00\x08 with strange controls.\n\n\n\nLine 2 has   multiple   spaces.'
    const pages = [
      {
        pageNumber: 42,
        title: 'Quantum Computing Principles',
        text: dirtyText,
      },
    ]

    const chunks = createChunksFromExtractedPages(pages, {
      courseId: 'c1',
      materialId: 'm1',
      sourceName: 'quantum.pdf',
      sourceType: 'PDF',
    })

    if (chunks.length !== 1) {
      throw new Error(`Expected 1 cleaned chunk, got ${chunks.length}`)
    }

    if (chunks[0].pageNumber !== 42) {
      throw new Error(`Page number 42 lost, got ${chunks[0].pageNumber}`)
    }

    if (chunks[0].text.includes('\x00') || chunks[0].text.includes('\x08')) {
      throw new Error('Unprintable control characters were not cleaned!')
    }

    if (chunks[0].text.includes('   ')) {
      throw new Error('Multiple horizontal spaces were not collapsed!')
    }

    console.log('   ✓ Semantic chunking & cleaning PASSED\n')
    passed++
  } catch (err: any) {
    console.error('   ✗ Semantic chunking failed:', err?.message || err)
    failed++
  }

  console.log(`========================================`)
  console.log(`Results: ${passed} PASSED, ${failed} FAILED`)
  console.log(`========================================`)

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})

import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker manually for the browser environment
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

export const convertPdfToImages = async (file: File): Promise<string[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const images: string[] = [];

  // Limit to 20 pages to avoid hitting heavy payload limits, though Gemini handles many.
  // You can adjust this limit.
  const maxPages = Math.min(pdf.numPages, 20);

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 }); // 1.5 scale for good readability
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) continue;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    // Convert to base64 string (removing the data:image/jpeg;base64, prefix for the API usually, 
    // but the helper usually handles full strings. Let's return raw base64 data)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    // Remove prefix for Gemini API consumption if needed, 
    // but typically we pass the base64 string. 
    // Format: "data:image/jpeg;base64,....." -> we want the part after comma.
    const base64Data = dataUrl.split(',')[1];
    
    if (base64Data) {
      images.push(base64Data);
    }
  }

  return images;
};
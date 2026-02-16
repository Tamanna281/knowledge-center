import domtoimage from 'dom-to-image-more';

export interface CaptureOptions {
    width?: number;
    height?: number;
    scale?: number;
}

/**
 * Reusable utility to capture a DOM element (like a chart) as an image
 * specifically optimized for PDF generation.
 * 
 * Uses dom-to-image-more which handles SVG rendering much better than html2canvas.
 */
export async function captureChartElement(
    elementId: string,
    options: CaptureOptions = {}
): Promise<string | null> {
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`Element with ID ${elementId} not found for capture.`);
        return null;
    }

    const {
        width = 1200,
        scale = 2
    } = options;

    try {
        console.log('[PDF Capture] Starting capture for:', elementId);

        // 1. Surgical Node Removal (Physically strip problematic Recharts layers)
        const artifacts = element.querySelectorAll(`
            .recharts-accessibility-layer, 
            .recharts-tooltip-wrapper, 
            .recharts-cursor, 
            .recharts-active-dot,
            [role="tooltip"],
            svg defs mask,
            svg defs clipPath
        `);
        artifacts.forEach(el => (el as HTMLElement).style.display = 'none');

        // 2. Temporarily inject a "Print Cleanup" style tag
        const cleanupStyle = document.createElement('style');
        cleanupStyle.innerHTML = `
            #${elementId}, #${elementId} * {
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
                border: none !important;
                box-shadow: none !important;
                outline: none !important;
                text-shadow: none !important;
            }
            #${elementId} {
                background-color: #111827 !important;
                border-radius: 12px !important;
            }
            /* Force SVG elements to lose their problematic interactive styles */
            svg rect, svg path, svg circle {
                outline: none !important;
                border: none !important;
            }
        `;
        document.head.appendChild(cleanupStyle);

        // Get actual element dimensions
        const actualWidth = element.offsetWidth;
        const actualHeight = element.offsetHeight;

        // 3. Capture the image
        const dataUrl = await domtoimage.toPng(element, {
            width: actualWidth * scale,
            height: actualHeight * scale,
            style: {
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                width: `${actualWidth}px`,
                height: `${actualHeight}px`,
                margin: '0',
                padding: '0',
                backgroundColor: '#111827'
            },
            quality: 1.0,
            bgcolor: '#111827'
        });

        // 4. Cleanup: Restore the temporary changes
        document.head.removeChild(cleanupStyle);
        artifacts.forEach(el => (el as HTMLElement).style.display = '');

        console.log('[PDF Capture] Image generated successfully, length:', dataUrl.length);
        return dataUrl;
    } catch (error) {
        console.error('[PDF Capture] Error capturing element:', error);
        return null;
    }
}

/**
 * Utility to calculate standard A4 PDF dimensions for an image
 */
export function calculatePdfImageSize(
    imgWidth: number,
    imgHeight: number,
    pageWidth: number,
    margin: number = 20
) {
    const maxWidth = pageWidth - (margin * 2);
    const ratio = imgHeight / imgWidth;
    const calculatedWidth = maxWidth;
    const calculatedHeight = maxWidth * ratio;

    return {
        width: calculatedWidth,
        height: calculatedHeight
    };
}

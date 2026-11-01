import React from 'react';
import { CardData, PrintConfig } from '../types/card';
import { BusinessCardFront } from './BusinessCardFront';
import { BusinessCardBack } from './BusinessCardBack';

interface PrintSheetProps {
  data: CardData;
  config: PrintConfig;
}

export const PrintSheet: React.FC<PrintSheetProps> = ({
  data,
  config
}) => {
  const isKr = config.size === 'kr-standard';
  const widthMm = isKr ? '90mm' : '85mm';
  const heightMm = isKr ? '50mm' : '55mm';

  // Precision 0.5pt Registration Hairline Crop Marks
  const CropMarks = () => (
    <div className="absolute inset-0 pointer-events-none -m-[3mm]">
      {/* 3mm Bleed Boundary Line (Dashed) */}
      <div className="absolute inset-0 border border-dashed border-neutral-400/50" />

      {/* Top-Left Corner Marks */}
      <div className="absolute top-0 left-[3mm] -mt-3 w-px h-3 bg-neutral-900" />
      <div className="absolute top-[3mm] left-0 -ml-3 w-3 h-px bg-neutral-900" />

      {/* Top-Right Corner Marks */}
      <div className="absolute top-0 right-[3mm] -mt-3 w-px h-3 bg-neutral-900" />
      <div className="absolute top-[3mm] right-0 -mr-3 w-3 h-px bg-neutral-900" />

      {/* Bottom-Left Corner Marks */}
      <div className="absolute bottom-0 left-[3mm] -mb-3 w-px h-3 bg-neutral-900" />
      <div className="absolute bottom-[3mm] left-0 -ml-3 w-3 h-px bg-neutral-900" />

      {/* Bottom-Right Corner Marks */}
      <div className="absolute bottom-0 right-[3mm] -mb-3 w-px h-3 bg-neutral-900" />
      <div className="absolute bottom-[3mm] right-0 -mr-3 w-3 h-px bg-neutral-900" />
    </div>
  );

  return (
    <div id="print-sheet-portal" className="hidden print:block print:w-full print:m-0 print:p-0">
      {/* =========================================================
          MODE 1: SINGLE CARD (2 Pages: Double-sided Commercial Print)
          ========================================================= */}
      {config.layout === 'single-card' && (
        <>
          {/* Page 1: Front */}
          <div className="print-page print-page-front break-after-page flex items-center justify-center min-h-screen">
            <div 
              className="relative print-card-box box-border"
              style={{ width: widthMm, height: heightMm }}
            >
              {config.showCropMarks && <CropMarks />}
              <div className="w-full h-full overflow-hidden">
                <BusinessCardFront data={data} theme={config.theme} isPrintPreview={true} />
              </div>
            </div>
          </div>

          {/* Page 2: Back */}
          <div className="print-page print-page-back flex items-center justify-center min-h-screen">
            <div 
              className="relative print-card-box box-border"
              style={{ width: widthMm, height: heightMm }}
            >
              {config.showCropMarks && <CropMarks />}
              <div className="w-full h-full overflow-hidden">
                <BusinessCardBack data={data} theme={config.theme} isPrintPreview={true} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* =========================================================
          MODE 2: 1-SHEET DUO (Front & Back side by side on 1 page)
          ========================================================= */}
      {config.layout === 'front-back-duo' && (
        <div className="print-page min-h-screen flex flex-col items-center justify-center gap-8 p-8">
          <div className="text-center mb-2">
            <h1 className="text-sm font-bold text-neutral-900 uppercase tracking-widest">
              {data.organization} — Official Identity Specification
            </h1>
            <p className="text-xs text-neutral-500">
              {data.name} · {data.title} ({widthMm} × {heightMm})
            </p>
          </div>

          <div className="flex items-center justify-center gap-8 flex-wrap">
            {/* Front */}
            <div 
              className="relative print-card-box box-border"
              style={{ width: widthMm, height: heightMm }}
            >
              {config.showCropMarks && <CropMarks />}
              <div className="w-full h-full overflow-hidden">
                <BusinessCardFront data={data} theme={config.theme} isPrintPreview={true} />
              </div>
            </div>

            {/* Back */}
            <div 
              className="relative print-card-box box-border"
              style={{ width: widthMm, height: heightMm }}
            >
              {config.showCropMarks && <CropMarks />}
              <div className="w-full h-full overflow-hidden">
                <BusinessCardBack data={data} theme={config.theme} isPrintPreview={true} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODE 3: A4 10-CARD MULTI-UP SHEET (Office & Home Printing)
          2 columns x 5 rows standard layout on 210 x 297mm paper
          Page 1: 10 Front cards
          Page 2: 10 Back cards
          ========================================================= */}
      {config.layout === 'a4-sheet' && (
        <>
          {/* Page 1: 10 Front Cards Grid */}
          <div className="print-page print-page-front break-after-page flex flex-col items-center justify-center w-[210mm] min-h-[297mm] mx-auto p-0">
            <div className="grid grid-cols-2 border border-neutral-300 divide-x divide-y divide-neutral-300">
              {Array.from({ length: 10 }).map((_, idx) => (
                <div 
                  key={`front-${idx}`}
                  style={{ width: widthMm, height: heightMm }}
                  className="relative overflow-hidden print-card-box"
                >
                  <BusinessCardFront data={data} theme={config.theme} isPrintPreview={true} />
                </div>
              ))}
            </div>
          </div>

          {/* Page 2: 10 Back Cards Grid (Aligned for duplex printing) */}
          <div className="print-page print-page-back flex flex-col items-center justify-center w-[210mm] min-h-[297mm] mx-auto p-0">
            <div className="grid grid-cols-2 border border-neutral-300 divide-x divide-y divide-neutral-300">
              {Array.from({ length: 10 }).map((_, idx) => (
                <div 
                  key={`back-${idx}`}
                  style={{ width: widthMm, height: heightMm }}
                  className="relative overflow-hidden print-card-box"
                >
                  <BusinessCardBack data={data} theme={config.theme} isPrintPreview={true} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

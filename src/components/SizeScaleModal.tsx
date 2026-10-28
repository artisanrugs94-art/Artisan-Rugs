import React from 'react';
import { X } from 'lucide-react';

interface SizeScaleModalProps {
  open: boolean;
  onClose: () => void;
  widthCm: number;
  heightCm: number;
  title: string;
  imageUrl: string;
}

export const SizeScaleModal: React.FC<SizeScaleModalProps> = ({
  open,
  onClose,
  widthCm,
  heightCm,
  title,
  imageUrl,
}) => {
  if (!open) return null;

  // Scale canvas: 340cm wide x 230cm tall studio room
  const scale = 1.4;
  const rugW = Math.min(260, Math.max(40, widthCm)) * scale;
  const rugH = Math.min(200, Math.max(40, heightCm)) * scale;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Preview rug scale in room"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-[#FAF8F5] dark:bg-[#1C1B19] border border-[#E6E1D8] dark:border-[#2E2C28] p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-[#E6E1D8] dark:border-[#2E2C28]">
          <div>
            <h3 className="text-base font-bold">Item Size Scale Preview</h3>
            <p className="text-xs text-[#5F5B55] dark:text-[#A6A198] mt-0.5">
              Comparing <strong className="font-mono-num">{widthCm} × {heightCm} cm</strong> against a standard 200cm door &amp; 200cm 3-seat sofa
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            aria-label="Close size preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 rounded-xl bg-[#EFECE6] dark:bg-[#121211] p-4 overflow-x-auto">
          <svg viewBox="0 0 640 360" className="w-full h-auto min-w-[480px]">
            {/* Wall / Floor line */}
            <line x1="20" y1="250" x2="620" y2="250" stroke="#9A948A" strokeWidth="2" />

            {/* Standard Door (80cm x 200cm) */}
            <g transform="translate(50, 50)">
              <rect x="0" y="0" width="96" height="200" fill="#FAF8F5" stroke="#5F5B55" strokeWidth="2" />
              <circle cx="82" cy="105" r="4" fill="#5F5B55" />
              <text x="48" y="-8" textAnchor="middle" fontSize="11" fill="#5F5B55">
                Door (200×80cm)
              </text>
            </g>

            {/* 3-Seat Sofa (200cm wide x 85cm tall) */}
            <g transform="translate(185, 165)">
              <rect x="0" y="25" width="240" height="60" rx="8" fill="#D8D2C7" stroke="#5F5B55" strokeWidth="2" />
              <rect x="12" y="0" width="216" height="38" rx="8" fill="#E5E0D6" stroke="#5F5B55" strokeWidth="2" />
              <text x="120" y="-8" textAnchor="middle" fontSize="11" fill="#5F5B55">
                3-Seat Sofa (200cm)
              </text>
            </g>

            {/* Human Silhouette (172cm) */}
            <g transform="translate(465, 78)">
              <circle cx="24" cy="18" r="14" fill="#8C857B" />
              <rect x="10" y="36" width="28" height="72" rx="10" fill="#8C857B" />
              <rect x="12" y="108" width="10" height="64" rx="4" fill="#8C857B" />
              <rect x="26" y="108" width="10" height="64" rx="4" fill="#8C857B" />
              <text x="24" y="-8" textAnchor="middle" fontSize="11" fill="#5F5B55">
                172cm
              </text>
            </g>

            {/* Selected Rug Placed in Foreground */}
            <g transform={`translate(${Math.max(150, 305 - rugW / 2)}, ${Math.min(265, 255)})`}>
              <rect
                x="0"
                y="0"
                width={rugW}
                height={Math.min(92, rugH * 0.48)}
                rx="8"
                fill="#111111"
                stroke="#D62828"
                strokeWidth="3"
              />
              <image
                href={imageUrl}
                x="4"
                y="4"
                width={Math.max(12, rugW - 8)}
                height={Math.max(12, Math.min(84, rugH * 0.48 - 8))}
                preserveAspectRatio="xMidYMid slice"
              />
              <text
                x={rugW / 2}
                y={Math.min(92, rugH * 0.48) + 16}
                textAnchor="middle"
                fontSize="12"
                fontWeight="bold"
                fill="#D62828"
              >
                {title.slice(0, 26)} ({widthCm}×{heightCm}cm)
              </text>
            </g>
          </svg>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#111111] text-white px-6 py-2 text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

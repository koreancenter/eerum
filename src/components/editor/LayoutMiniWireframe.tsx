import React from 'react';
import { CardLayoutType } from '../../types/card';

interface WireframeStyleTokens {
  strokeClass: string;
  subClass: string;
  isSelected: boolean;
}

const LANDSCAPE_FRAME_CLASS =
  'w-full aspect-[9/5] p-2.5 rounded-md bg-[#121214] border border-white/[0.05] flex flex-col justify-between';
const PORTRAIT_FRAME_CLASS =
  'w-[68%] mx-auto aspect-[5/8] p-2.5 rounded-md bg-[#121214] border border-white/[0.05] flex flex-col justify-between';

const LAYOUT_WIREFRAME_RENDERERS: Record<
  CardLayoutType,
  (tokens: WireframeStyleTokens) => React.ReactNode
> = {
  editorial_minimal: ({ strokeClass, subClass }) => (
    <div className={LANDSCAPE_FRAME_CLASS}>
      <div className="space-y-1">
        <div className={`w-10 h-[3px] rounded-full ${subClass}`} />
        <div className={`w-16 h-1 rounded-full ${strokeClass}`} />
      </div>
      <div className="space-y-1 my-auto">
        <div className={`w-14 h-1.5 rounded-full ${strokeClass}`} />
        <div className={`w-9 h-[3px] rounded-full ${subClass}`} />
      </div>
      <div className="flex justify-between items-end pt-1.5 border-t border-white/[0.05]">
        <div className={`w-10 h-[3px] rounded-full ${subClass}`} />
        <div className={`w-7 h-[3px] rounded-full ${subClass}`} />
      </div>
    </div>
  ),

  monogram_executive: ({ strokeClass, subClass, isSelected }) => (
    <div className={`${LANDSCAPE_FRAME_CLASS} items-center text-center`}>
      <div className="flex flex-col items-center gap-1">
        <div
          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
            isSelected ? 'border-zinc-400' : 'border-zinc-700'
          }`}
        >
          <div className={`w-1 h-1 rounded-full ${strokeClass}`} />
        </div>
        <div className={`w-12 h-[3px] rounded-full ${subClass}`} />
      </div>
      <div className="space-y-1 my-auto flex flex-col items-center">
        <div className={`w-14 h-1.5 rounded-full ${strokeClass}`} />
        <div className={`w-10 h-[3px] rounded-full ${subClass}`} />
      </div>
      <div className={`w-20 h-[3px] rounded-full ${subClass}`} />
    </div>
  ),

  vertical_atelier: ({ strokeClass, subClass }) => (
    <div className={PORTRAIT_FRAME_CLASS}>
      <div className="space-y-1 pb-1.5 border-b border-white/[0.05]">
        <div className={`w-7 h-[2px] rounded-full ${subClass}`} />
        <div className={`w-11 h-[3px] rounded-full ${strokeClass}`} />
      </div>
      <div className="space-y-1 my-auto">
        <div className={`w-14 h-1.5 rounded-full ${strokeClass}`} />
        <div className={`w-9 h-[3px] rounded-full ${subClass}`} />
      </div>
      <div className="space-y-1 pt-1.5 border-t border-white/[0.05]">
        <div className={`w-12 h-[2px] rounded-full ${subClass}`} />
        <div className={`w-9 h-[2px] rounded-full ${subClass}`} />
      </div>
    </div>
  ),

  serenity_vertical: ({ strokeClass, subClass }) => (
    <div className={PORTRAIT_FRAME_CLASS}>
      <div className="space-y-1">
        <div className={`w-13 h-1.5 rounded-full ${strokeClass}`} />
        <div className={`w-8 h-[3px] rounded-full ${subClass}`} />
        <div className={`w-10 h-[2px] rounded-full ${subClass} mt-1`} />
      </div>
      <div className="flex-1" />
      <div className="space-y-1 pt-2 border-t border-white/[0.05]">
        <div className={`w-10 h-[2px] rounded-full ${subClass}`} />
        <div className={`w-13 h-[2px] rounded-full ${subClass}`} />
        <div className={`w-8 h-[2px] rounded-full ${subClass}`} />
      </div>
    </div>
  ),

  swiss_typo_bold: ({ strokeClass, subClass }) => (
    <div className={LANDSCAPE_FRAME_CLASS}>
      <div className={`w-20 h-1 rounded-full ${strokeClass}`} />
      <div className="space-y-1 my-auto">
        <div className={`w-16 h-2 rounded-full ${strokeClass}`} />
        <div className={`w-10 h-[3px] rounded-full ${subClass}`} />
      </div>
      <div className="grid grid-cols-2 gap-1 pt-1.5 border-t border-white/[0.05]">
        <div className={`w-9 h-[3px] rounded-full ${subClass}`} />
        <div className={`w-7 h-[3px] rounded-full ${subClass}`} />
      </div>
    </div>
  ),

  warm_organic: ({ strokeClass, subClass }) => (
    <div className={LANDSCAPE_FRAME_CLASS}>
      <div className="flex justify-between items-start">
        <div className={`w-12 h-[3px] rounded-full ${subClass}`} />
        <div className={`w-1.5 h-1.5 rounded-full ${strokeClass}`} />
      </div>
      <div className="space-y-1 my-auto">
        <div className={`w-14 h-1 rounded-full ${strokeClass}`} />
        <div className={`w-9 h-[3px] rounded-full ${subClass}`} />
      </div>
      <div className="flex justify-between items-center pt-1.5 border-t border-white/[0.05]">
        <div className={`w-9 h-[3px] rounded-full ${subClass}`} />
        <div className={`w-5 h-[3px] rounded-full ${subClass}`} />
      </div>
    </div>
  ),
};

export interface LayoutMiniWireframeProps {
  layoutId: CardLayoutType;
  isSelected: boolean;
}

export const LayoutMiniWireframe: React.FC<LayoutMiniWireframeProps> = React.memo(
  ({ layoutId, isSelected }) => {
    const strokeClass = isSelected ? 'bg-[#E4E4E7]' : 'bg-zinc-600';
    const subClass = isSelected ? 'bg-zinc-500' : 'bg-zinc-700/80';
    const renderWireframe =
      LAYOUT_WIREFRAME_RENDERERS[layoutId] ?? LAYOUT_WIREFRAME_RENDERERS.warm_organic;

    return <>{renderWireframe({ strokeClass, subClass, isSelected })}</>;
  }
);

LayoutMiniWireframe.displayName = 'LayoutMiniWireframe';

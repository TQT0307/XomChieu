import React, { useEffect, useRef, useState } from 'react';

import {

  X, Play, Image as ImageIcon, Film, User, ChevronLeft, ChevronRight,

  ZoomIn, ZoomOut, RotateCcw, Move, ExternalLink, Maximize2, Minimize2,

  Copy, Check

} from 'lucide-react';

import { Highlight } from '../types';

import useModalScrollLock from '../hooks/useModalScrollLock';

import {

  getHighlightMediaCounts,

  getHighlightMediaKind,

  getPastedHighlightVideoUrl,

  getHighlightVideoEmbedUrl,

  getHighlightVideoProvider,

  getHighlightVideoProviderLabel,

  getYouTubeThumbnailUrl

} from '../../shared/highlightMedia';



interface HighlightDetailModalProps {

  highlight: Highlight | null;

  onClose: () => void;

}



export default function HighlightDetailModal({ highlight, onClose }: HighlightDetailModalProps) {

  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  const [zoom, setZoom] = useState(1);

  const [maxZoom, setMaxZoom] = useState(1);

  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });

  const [isDraggingImage, setIsDraggingImage] = useState(false);

  const [isMediaFullscreen, setIsMediaFullscreen] = useState(false);

  const [copiedUrl, setCopiedUrl] = useState('');

  const mediaViewportRef = useRef<HTMLDivElement>(null);

  const mediaArenaRef = useRef<HTMLDivElement>(null);

  const imageBaseSizeRef = useRef({ width: 0, height: 0 });

  const dragStartRef = useRef({ pointerX: 0, pointerY: 0, imageX: 0, imageY: 0 });

  useModalScrollLock(Boolean(highlight), onClose);



  useEffect(() => {

    setActiveMediaIndex(0);

  }, [highlight?.id]);



  useEffect(() => {

    setZoom(1);

    setMaxZoom(1);

    setImageOffset({ x: 0, y: 0 });

    setIsDraggingImage(false);

    setCopiedUrl('');

  }, [highlight?.id, activeMediaIndex]);



  useEffect(() => {

    const handleFullscreenChange = () => {

      setIsMediaFullscreen(document.fullscreenElement === mediaArenaRef.current);

    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);

  }, []);



  const toggleMediaFullscreen = async () => {

    const arena = mediaArenaRef.current;

    if (!arena) return;



    try {

      if (document.fullscreenElement === arena) {

        await document.exitFullscreen();

      } else if (!document.fullscreenElement && arena.requestFullscreen) {

        await arena.requestFullscreen();

      }

    } catch {

      // The embedded provider still exposes its native fullscreen control.

      setIsMediaFullscreen(false);

    }

  };



  if (!highlight) return null;



  const mediaItems = (highlight.mediaUrls || [])

    .map((url, index) => ({

      url,

      note: highlight.mediaNotes?.[index]?.trim() || ''

    }))

    .filter(item => Boolean(item.url) && item.url !== highlight.thumbnail);



  // Thumbnail is reserved for the public listing card. The detail viewer only

  // shows media explicitly added to the detail gallery.

  const mediaList = mediaItems.map(item => item.url);

  const activeMediaNote = mediaItems[activeMediaIndex]?.note || '';

  const activeMediaNoteUrls = Array.from(new Set(

    (activeMediaNote.match(/https?:\/\/[^\s<>"']+/gi) || [])

      .map(url => url.replace(/[),.;!?]+$/g, ''))

      .filter(Boolean)

  ));



  const copyUrl = async (url: string) => {

    try {

      await navigator.clipboard.writeText(url);

    } catch {

      const temporaryInput = document.createElement('textarea');

      temporaryInput.value = url;

      temporaryInput.setAttribute('readonly', '');

      temporaryInput.style.position = 'fixed';

      temporaryInput.style.opacity = '0';

      document.body.appendChild(temporaryInput);

      temporaryInput.select();

      document.execCommand('copy');

      temporaryInput.remove();

    }

    setCopiedUrl(url);

    window.setTimeout(() => {

      setCopiedUrl(previous => previous === url ? '' : previous);

    }, 1800);

  };

  const handleNext = () => {

    setActiveMediaIndex((prev) => (prev + 1) % mediaList.length);

  };



  const handlePrev = () => {

    setActiveMediaIndex((prev) => (prev - 1 + mediaList.length) % mediaList.length);

  };



  const clampImageOffset = (x: number, y: number, targetZoom: number) => {

    const viewport = mediaViewportRef.current;

    const baseSize = imageBaseSizeRef.current;

    if (!viewport || baseSize.width === 0 || baseSize.height === 0) return { x: 0, y: 0 };



    const maxX = Math.max(0, (baseSize.width * targetZoom - viewport.clientWidth) / 2);

    const maxY = Math.max(0, (baseSize.height * targetZoom - viewport.clientHeight) / 2);

    return {

      x: Math.max(-maxX, Math.min(maxX, x)),

      y: Math.max(-maxY, Math.min(maxY, y))

    };

  };



  const changeZoom = (nextZoom: number) => {

    const limitedZoom = Math.max(1, Math.min(maxZoom, nextZoom));

    setZoom(limitedZoom);

    setImageOffset(previous => clampImageOffset(previous.x, previous.y, limitedZoom));

  };



  const resetImageView = () => {

    setZoom(1);

    setImageOffset({ x: 0, y: 0 });

  };



  const isVideoUrl = (url: string) => getHighlightMediaKind(url) === 'video';

  const mediaCounts = getHighlightMediaCounts(highlight.mediaUrls || []);

  const activeMediaUrl = mediaList[activeMediaIndex] || '';

  const activePastedVideoUrl = getPastedHighlightVideoUrl(activeMediaUrl);

  const activeVideoEmbedUrl = getHighlightVideoEmbedUrl(activeMediaUrl);

  const activeVideoProvider = getHighlightVideoProvider(activeMediaUrl);

  const activeVideoProviderLabel = getHighlightVideoProviderLabel(activeMediaUrl);



  return (

    <div

      className="modal-scroll-lock modal-scroll-region detail-scrollbar fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"

      onClick={event => {

        if (event.target === event.currentTarget) onClose();

      }}

    >

      <button

        type="button"

        className="absolute inset-0 h-full w-full cursor-default"

        onClick={onClose}

        aria-label="Đóng cửa sổ chi tiết highlight"

      />

      <div className="relative z-10 bg-slate-800 text-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-600 animate-in fade-in zoom-in-95 duration-200">

       

        {/* Header bar */}

        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">

          <div>

            <span className="inline-flex items-center gap-1.5 bg-[#FFF200] text-slate-900 text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-wider">

              {mediaCounts.videos > 0 ? <Film className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}

              {highlight.contentType === 'tập luyện'

                ? 'Tập luyện hằng ngày'

                : highlight.contentType === 'thăng cấp đai'

                  ? 'Thi thăng cấp đai'

                  : 'Khoảnh khắc thi đấu'}

            </span>

            <h3 className="text-lg sm:text-xl font-bold mt-1 text-[#FFF200] leading-tight">

              {highlight.title}

            </h3>

            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">

              <User className="w-3 h-3 text-[#0054A6]" />

              VĐV thực hiện: <span className="font-bold text-slate-200">{highlight.athleteName}</span>

            </p>

          </div>

          <button

            onClick={onClose}

            className="bg-slate-800 hover:bg-slate-700 text-white p-2.5 rounded-full transition-all cursor-pointer"

          >

            <X className="w-5 h-5" />

          </button>

        </div>



        {/* Media Viewer Arena */}

        <div

          ref={mediaArenaRef}

          className={'relative flex items-center justify-center bg-black group ' + (

            isMediaFullscreen ? 'h-[100dvh] w-screen min-h-0 max-h-none' : 'h-[50vh] min-h-[320px] max-h-[600px]'

          )}

        >

          {/* Main Media Display */}

          <div

            ref={mediaViewportRef}

            className="w-full h-full flex items-center justify-center overflow-hidden"

          >

            {!activeMediaUrl ? (

              <div className="mx-5 max-w-md rounded-2xl border border-slate-700 bg-slate-900/80 p-6 text-center shadow-xl">

                <ImageIcon className="mx-auto h-10 w-10 text-slate-500" />

                <p className="mt-3 text-base font-bold text-white">{'Ch\u01b0a c\u00f3 \u1ea3nh/clip chi ti\u1ebft'}</p>

                <p className="mt-1 text-sm text-slate-400">{'Thumbnail ch\u1ec9 hi\u1ec3n th\u1ecb \u1edf danh s\u00e1ch Highlights.'}</p>

              </div>

            ) : activeVideoEmbedUrl ? (

              <iframe

                src={activeVideoEmbedUrl}

                title={`${highlight.title} - clip ${activeMediaIndex + 1}`}

                className="h-full w-full border-0 bg-black"

                loading="lazy"

                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"

                allowFullScreen

              />

            ) : activeVideoProvider === 'direct' ? (

              <video

                src={activeMediaUrl}

                controls

                preload="metadata"

                playsInline

                className="h-full w-full bg-black object-contain"

              />

            ) : activeVideoProvider ? (

              <div className="mx-5 max-w-md rounded-2xl border border-slate-600 bg-slate-800 p-6 text-center shadow-xl">

                <Film className="mx-auto h-10 w-10 text-[#FFF200]" />

                <p className="mt-3 text-base font-bold text-white">{'N\u1ed9i dung t\u1eeb ' + activeVideoProviderLabel}</p>

                <p className="mt-1 text-sm text-slate-300">{'N\u1ec1n t\u1ea3ng n\u00e0y gi\u1edbi h\u1ea1n ph\u00e1t nh\u00fang. M\u1edf b\u00e0i g\u1ed1c \u0111\u1ec3 xem \u0111\u1ea7y \u0111\u1ee7.'}</p>

                <a

                  href={activeMediaUrl}

                  target="_blank"

                  rel="noopener noreferrer"

                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#FFF200] px-4 py-2.5 text-sm font-black text-slate-900 transition-transform hover:scale-105"

                >

                  {'M\u1edf tr\u00ean ' + activeVideoProviderLabel}

                  <ExternalLink className="h-4 w-4" />

                </a>

              </div>

            ) : (

              <img

                src={mediaList[activeMediaIndex]}

                alt={`${highlight.title} - ${activeMediaIndex + 1}`}

                draggable={false}

                onLoad={event => {

                  const image = event.currentTarget;

                  const width = image.offsetWidth;

                  const height = image.offsetHeight;

                  imageBaseSizeRef.current = { width, height };

                  const nativeZoomLimit = Math.min(

                    image.naturalWidth / Math.max(1, width),

                    image.naturalHeight / Math.max(1, height)

                  );

                  setMaxZoom(Math.max(1, Math.min(4, nativeZoomLimit)));

                }}

                onDoubleClick={() => changeZoom(zoom > 1 ? 1 : Math.min(2, maxZoom))}

                onPointerDown={event => {

                  if (zoom <= 1) return;

                  event.currentTarget.setPointerCapture(event.pointerId);

                  dragStartRef.current = {

                    pointerX: event.clientX,

                    pointerY: event.clientY,

                    imageX: imageOffset.x,

                    imageY: imageOffset.y

                  };

                  setIsDraggingImage(true);

                }}

                onPointerMove={event => {

                  if (!isDraggingImage) return;

                  const start = dragStartRef.current;

                  setImageOffset(clampImageOffset(

                    start.imageX + event.clientX - start.pointerX,

                    start.imageY + event.clientY - start.pointerY,

                    zoom

                  ));

                }}

                onPointerUp={event => {

                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {

                    event.currentTarget.releasePointerCapture(event.pointerId);

                  }

                  setIsDraggingImage(false);

                }}

                onPointerCancel={() => setIsDraggingImage(false)}

                className={`max-w-full max-h-full object-contain select-none ${

                  zoom > 1 ? (isDraggingImage ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'

                }`}

                style={{

                  transform: `translate3d(${imageOffset.x}px, ${imageOffset.y}px, 0) scale(${zoom})`,

                  transformOrigin: 'center',

                  transition: isDraggingImage ? 'none' : 'transform 160ms ease-out',

                  imageRendering: 'auto',

                  touchAction: zoom > 1 ? 'none' : 'auto'

                }}

                referrerPolicy="no-referrer"

              />

            )}

          </div>



          {Boolean(activeMediaUrl) && isVideoUrl(activeMediaUrl) && typeof document !== 'undefined' && document.fullscreenEnabled && (

            <button

              type="button"

              onClick={() => void toggleMediaFullscreen()}

              className="absolute right-3 top-3 z-20 inline-flex items-center gap-2 rounded-xl border border-white/25 bg-slate-950/75 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-slate-900 cursor-pointer"

              aria-label={isMediaFullscreen ? 'Thoát toàn màn hình' : 'Xem video toàn màn hình'}

              title={isMediaFullscreen ? 'Thoát toàn màn hình' : 'Xem video toàn màn hình'}

            >

              {isMediaFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}

              <span className="hidden sm:inline">{isMediaFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}</span>

            </button>

          )}



          {Boolean(activeMediaUrl) && !isVideoUrl(activeMediaUrl) && (

            <div className="absolute top-3 right-3 flex items-center gap-1 rounded-xl border border-slate-600 bg-slate-800/90 p-1.5 shadow-lg">

              <button

                type="button"

                onClick={() => changeZoom(zoom - 0.25)}

                disabled={zoom <= 1}

                title="Thu nhỏ ảnh"

                className="p-2 rounded-lg text-white hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"

              >

                <ZoomOut className="w-4 h-4" />

              </button>

              <span className="min-w-12 text-center text-[10px] font-bold text-white">

                {Math.round(zoom * 100)}%

              </span>

              <button

                type="button"

                onClick={() => changeZoom(zoom + 0.25)}

                disabled={zoom >= maxZoom - 0.01}

                title="Phóng to theo độ phân giải gốc"

                className="p-2 rounded-lg text-white hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"

              >

                <ZoomIn className="w-4 h-4" />

              </button>

              <button

                type="button"

                onClick={resetImageView}

                disabled={zoom === 1 && imageOffset.x === 0 && imageOffset.y === 0}

                title="Đặt lại vị trí ảnh"

                className="p-2 rounded-lg text-white hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"

              >

                <RotateCcw className="w-4 h-4" />

              </button>

            </div>

          )}



          {/* Navigation Arrows for Multiple Media */}

          {mediaList.length > 1 && (

            <>

              <button

                onClick={handlePrev}

                className="absolute left-4 bg-slate-800/85 hover:bg-slate-700 text-white p-3 rounded-full transition-all border border-slate-600 cursor-pointer"

              >

                <ChevronLeft className="w-5 h-5" />

              </button>

              <button

                onClick={handleNext}

                className="absolute right-4 bg-slate-800/85 hover:bg-slate-700 text-white p-3 rounded-full transition-all border border-slate-600 cursor-pointer"

              >

                <ChevronRight className="w-5 h-5" />

              </button>

            </>

          )}



          {/* Media Count Indicator */}

          {mediaList.length > 0 && (

            <div className="absolute bottom-4 right-4 bg-slate-800/90 text-xs px-3 py-1 rounded-full border border-slate-600">

              {activeMediaIndex + 1} / {mediaList.length}

            </div>

          )}



          {Boolean(activeMediaUrl) && !isVideoUrl(activeMediaUrl) && zoom > 1 && (

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-800/90 px-3 py-1 text-[10px] text-slate-100 pointer-events-none">

              <Move className="w-3 h-3" />

              Kéo ảnh để căn vị trí

            </div>

          )}

        </div>



        {/* The note always follows the currently selected image. */}

        {mediaList.length > 0 && (

        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800">

          <p className="text-[10px] font-black uppercase tracking-wider text-[#FFF200] mb-1">

            Ghi chú tư liệu {activeMediaIndex + 1}/{mediaList.length}

          </p>

          <p className={`text-xs sm:text-sm leading-relaxed whitespace-pre-line ${

            activeMediaNote ? 'text-slate-200' : 'text-slate-500 italic'

          }`}>

            {activeMediaNote || 'Tư liệu này chưa có ghi chú.'}

          </p>

          {activePastedVideoUrl && (

            <div className="mt-3 rounded-xl border border-sky-400/25 bg-sky-400/[0.07] p-2.5">

              <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-sky-300">

                Link clip gốc

              </p>

              <div className="flex items-center gap-2">

                <a

                  href={activePastedVideoUrl}

                  target="_blank"

                  rel="noopener noreferrer"

                  className="min-w-0 flex-1 truncate text-xs font-semibold text-sky-300 underline decoration-sky-500/50 underline-offset-2 hover:text-sky-200"

                  title={activePastedVideoUrl}

                >

                  {activePastedVideoUrl}

                </a>

                <button

                  type="button"

                  onClick={() => void copyUrl(activePastedVideoUrl)}

                  className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[#FFF200]/35 bg-[#FFF200]/10 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-[#FFF200] transition-colors hover:bg-[#FFF200]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFF200]"

                  aria-label="Sao chép link clip gốc"

                  title={copiedUrl === activePastedVideoUrl ? 'Đã sao chép link clip' : 'Sao chép link clip'}

                >

                  {copiedUrl === activePastedVideoUrl ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}

                  <span>{copiedUrl === activePastedVideoUrl ? 'Đã chép' : 'Sao chép'}</span>

                </button>

              </div>

            </div>

          )}          {activeMediaNoteUrls.length > 0 && (

            <div className="mt-2 space-y-2" aria-label="Liên kết trong ghi chú">

              {activeMediaNoteUrls.map(url => (

                <div

                  key={url}

                  className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/85 p-2"

                >

                  <a

                    href={url}

                    target="_blank"

                    rel="noopener noreferrer"

                    className="min-w-0 flex-1 truncate text-xs font-semibold text-sky-300 underline decoration-sky-500/50 underline-offset-2 hover:text-sky-200"

                    title={url}

                  >

                    {url}

                  </a>

                  <button

                    type="button"

                    onClick={() => void copyUrl(url)}

                    className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[#FFF200]/35 bg-[#FFF200]/10 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-[#FFF200] transition-colors hover:bg-[#FFF200]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFF200]"

                    aria-label={`Sao chép liên kết ${url}`}

                    title={copiedUrl === url ? 'Đã sao chép liên kết' : 'Sao chép liên kết'}

                  >

                    {copiedUrl === url ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}

                    <span>{copiedUrl === url ? 'Đã chép' : 'Sao chép'}</span>

                  </button>

                </div>

              ))}

            </div>

          )}

        </div>

        )}



        {/* Thumbnails Strip / Multi-Media Selector */}

        {mediaList.length > 1 && (

          <div className="p-4 bg-slate-950 border-t border-slate-800">

            <p className="text-xs text-slate-400 mb-2 font-semibold">Tất cả tư liệu bài viết ({mediaList.length}):</p>

            <div className="detail-scrollbar flex gap-2.5 overflow-x-auto pb-2">

              {mediaList.map((mediaUrl, idx) => {

                const isVid = isVideoUrl(mediaUrl);

                return (

                  <button

                    key={idx}

                    onClick={() => setActiveMediaIndex(idx)}

                    title={mediaItems[idx]?.note || `Tư liệu ${idx + 1}`}

                    className={`relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all cursor-pointer ${

                      activeMediaIndex === idx ? 'border-[#FFF200] scale-105 shadow' : 'border-slate-800 opacity-60 hover:opacity-100'

                    }`}

                  >

                    {isVid ? (

                      <div className="relative w-full h-full bg-slate-800 flex items-center justify-center overflow-hidden">

                        {getYouTubeThumbnailUrl(mediaUrl) && (

                          <img

                            src={getYouTubeThumbnailUrl(mediaUrl) || ''}

                            alt="thumbnail clip"

                            className="absolute inset-0 h-full w-full object-cover opacity-70"

                            loading="lazy"

                          />

                        )}

                        <Play className="relative z-10 w-4 h-4 text-[#FFF200] fill-current" />

                      </div>

                    ) : (

                      <img

                        src={mediaUrl}

                        alt="thumbnail"

                        className="w-full h-full object-cover"

                        referrerPolicy="no-referrer"

                      />

                    )}

                  </button>

                );

              })}

            </div>

          </div>

        )}



        {/* Extra info/footer */}

        <div className="p-6 bg-slate-900 border-t border-slate-800 text-sm text-slate-400">

          <p>

            Kho tư liệu Vovinam Xóm Chiếu lưu giữ cả khoảnh khắc thi đấu và sinh hoạt tập luyện hằng ngày. Bài này gồm {mediaCounts.images} ảnh và {mediaCounts.videos} clip.

          </p>

        </div>



      </div>

    </div>

  );

}